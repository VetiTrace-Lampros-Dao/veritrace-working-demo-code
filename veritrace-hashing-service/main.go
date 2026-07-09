package main

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"

	"github.com/corona10/goimagehash"
)

type KeyframeResponse struct {
	Offset uint64 `json:"offset"`
	PHash  uint64 `json:"phash"`
}

type HashResponse struct {
	SHA256    string             `json:"sha256"`
	PHash     uint64             `json:"phash"`
	MediaType string             `json:"media_type"`
	Keyframes []KeyframeResponse `json:"keyframes,omitempty"`
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	http.HandleFunc("/api/v1/hash", corsHandler(hashHandler))

	fs := http.FileServer(http.Dir("./static"))
	http.Handle("/", corsHandler(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" && !strings.HasPrefix(r.URL.Path, "/api/") {
			if _, err := os.Stat(filepath.Join("./static", r.URL.Path)); os.IsNotExist(err) {
				http.ServeFile(w, r, "./static/index.html")
				return
			}
		}
		fs.ServeHTTP(w, r)
	}))

	log.Printf("Hashing service is running on port %s\n", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("failed to start server: %v", err)
	}
}

func corsHandler(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		h(w, r)
	}
}

func hashHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	err := r.ParseMultipartForm(50 << 20)
	if err != nil {
		http.Error(w, "file size limit exceeded", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "missing file parameter", http.StatusBadRequest)
		return
	}
	defer file.Close()

	tempFile, err := os.CreateTemp("", "upload-*"+filepath.Ext(header.Filename))
	if err != nil {
		http.Error(w, "failed to create temp file", http.StatusInternalServerError)
		return
	}
	defer os.Remove(tempFile.Name())
	defer tempFile.Close()

	hasher := sha256.New()
	multiWriter := io.MultiWriter(tempFile, hasher)

	_, err = io.Copy(multiWriter, file)
	if err != nil {
		http.Error(w, "failed to read file", http.StatusInternalServerError)
		return
	}

	sha256Hex := fmt.Sprintf("0x%x", hasher.Sum(nil))
	mimeType := header.Header.Get("Content-Type")
	isImg := strings.HasPrefix(mimeType, "image/")
	isVid := strings.HasPrefix(mimeType, "video/")
	isPdf := mimeType == "application/pdf"
	isDocx := mimeType == "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || mimeType == "application/msword"

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if !isImg && !isVid && !isPdf && !isDocx {
		if ext == ".png" || ext == ".jpg" || ext == ".jpeg" || ext == ".gif" || ext == ".webp" {
			isImg = true
		} else if ext == ".mp4" || ext == ".avi" || ext == ".mkv" || ext == ".mov" || ext == ".webm" {
			isVid = true
		} else if ext == ".pdf" {
			isPdf = true
		} else if ext == ".docx" || ext == ".doc" {
			isDocx = true
		}
	}

	if !isImg && !isVid && !isPdf && !isDocx {
		http.Error(w, "unsupported media type", http.StatusBadRequest)
		return
	}

	if isImg {
		_, _ = tempFile.Seek(0, 0)
		img, _, err := image.Decode(tempFile)
		if err != nil {
			http.Error(w, "failed to decode image: "+err.Error(), http.StatusBadRequest)
			return
		}

		hash, err := goimagehash.PerceptionHash(img)
		if err != nil {
			http.Error(w, "failed to calculate perceptual hash", http.StatusInternalServerError)
			return
		}

		res := HashResponse{
			SHA256:    sha256Hex,
			PHash:     hash.GetHash(),
			MediaType: "image",
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(res)
		return
	}

	tempDir, err := os.MkdirTemp("", "frames-*")
	if err != nil {
		http.Error(w, "failed to create working directory", http.StatusInternalServerError)
		return
	}
	defer os.RemoveAll(tempDir)

	if isDocx {
		pdfName := strings.TrimSuffix(filepath.Base(tempFile.Name()), filepath.Ext(tempFile.Name())) + ".pdf"
		cmd := exec.Command("libreoffice", "--headless", "--convert-to", "pdf", "--outdir", tempDir, tempFile.Name())
		if err := cmd.Run(); err != nil {
			http.Error(w, "failed to convert docx to pdf: "+err.Error(), http.StatusInternalServerError)
			return
		}
		convertedPdfPath := filepath.Join(tempDir, pdfName)
		tempFile.Close()
		tempFile, err = os.Open(convertedPdfPath)
		if err != nil {
			http.Error(w, "failed to open converted pdf: "+err.Error(), http.StatusInternalServerError)
			return
		}
		isPdf = true
	}

	if isPdf {
		cmd := exec.Command("pdftoppm", "-jpeg", "-r", "150", tempFile.Name(), filepath.Join(tempDir, "page"))
		if err := cmd.Run(); err != nil {
			http.Error(w, "failed to render PDF pages: "+err.Error(), http.StatusInternalServerError)
			return
		}

		files, err := os.ReadDir(tempDir)
		if err != nil {
			http.Error(w, "failed to read PDF pages: "+err.Error(), http.StatusInternalServerError)
			return
		}

		var pageFiles []string
		for _, f := range files {
			if strings.HasPrefix(f.Name(), "page-") && strings.HasSuffix(f.Name(), ".jpg") {
				pageFiles = append(pageFiles, f.Name())
			}
		}

		sort.Slice(pageFiles, func(i, j int) bool {
			var numI, numJ int
			_, _ = fmt.Sscanf(pageFiles[i], "page-%d.jpg", &numI)
			_, _ = fmt.Sscanf(pageFiles[j], "page-%d.jpg", &numJ)
			return numI < numJ
		})

		var keyframes []KeyframeResponse
		for _, f := range pageFiles {
			var pageNum int
			_, _ = fmt.Sscanf(f, "page-%d.jpg", &pageNum)

			framePath := filepath.Join(tempDir, f)
			fReader, err := os.Open(framePath)
			if err != nil {
				continue
			}
			img, _, err := image.Decode(fReader)
			fReader.Close()
			if err != nil {
				continue
			}

			hash, err := goimagehash.PerceptionHash(img)
			if err != nil {
				continue
			}

			keyframes = append(keyframes, KeyframeResponse{
				Offset: uint64(pageNum),
				PHash:  hash.GetHash(),
			})
		}

		if len(keyframes) == 0 {
			http.Error(w, "failed to extract pages from document", http.StatusInternalServerError)
			return
		}

		res := HashResponse{
			SHA256:    sha256Hex,
			PHash:     keyframes[0].PHash,
			MediaType: "document",
			Keyframes: keyframes,
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(res)
		return
	}

	if isVid {
		cmd := exec.Command("ffmpeg", "-i", tempFile.Name(), "-vf", "fps=1", filepath.Join(tempDir, "frame_%d.jpg"))
		if err := cmd.Run(); err != nil {
			http.Error(w, "ffmpeg processing failed: "+err.Error(), http.StatusInternalServerError)
			return
		}

		files, err := os.ReadDir(tempDir)
		if err != nil {
			http.Error(w, "failed to read frames", http.StatusInternalServerError)
			return
		}

		sort.Slice(files, func(i, j int) bool {
			var numI, numJ int
			_, _ = fmt.Sscanf(files[i].Name(), "frame_%d.jpg", &numI)
			_, _ = fmt.Sscanf(files[j].Name(), "frame_%d.jpg", &numJ)
			return numI < numJ
		})

		var keyframes []KeyframeResponse
		for idx, f := range files {
			framePath := filepath.Join(tempDir, f.Name())
			fReader, err := os.Open(framePath)
			if err != nil {
				continue
			}
			img, _, err := image.Decode(fReader)
			fReader.Close()
			if err != nil {
				continue
			}

			hash, err := goimagehash.PerceptionHash(img)
			if err != nil {
				continue
			}

			keyframes = append(keyframes, KeyframeResponse{
				Offset: uint64(idx),
				PHash:  hash.GetHash(),
			})
		}

		if len(keyframes) == 0 {
			http.Error(w, "failed to extract keyframes", http.StatusInternalServerError)
			return
		}

		res := HashResponse{
			SHA256:    sha256Hex,
			PHash:     keyframes[0].PHash,
			MediaType: "video",
			Keyframes: keyframes,
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(res)
		return
	}

}
