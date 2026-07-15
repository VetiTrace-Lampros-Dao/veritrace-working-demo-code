package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/corona10/goimagehash"
)

type KeyframeResponse struct {
	Offset       uint64    `json:"offset"`
	PHash        uint64    `json:"phash"`
	SemanticHash      []float32 `json:"semantic_hash,omitempty"`
	AiConfidenceScore float32   `json:"ai_confidence_score,omitempty"`
	Text         string    `json:"text,omitempty"`
}

type HashResponse struct {
	SHA256       string             `json:"sha256"`
	PHash        uint64             `json:"phash"`
	SemanticHash      []float32          `json:"semantic_hash,omitempty"`
	AiConfidenceScore float32            `json:"ai_confidence_score,omitempty"`
	MediaType    string             `json:"media_type"`
	Keyframes    []KeyframeResponse `json:"keyframes,omitempty"`
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

		semanticHash, aiConf := getSemanticHash(tempFile.Name())

		res := HashResponse{
			SHA256:            sha256Hex,
			PHash:             hash.GetHash(),
			SemanticHash:      semanticHash,
			AiConfidenceScore: aiConf,
			MediaType:         "image",
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
		pageCount := getPDFPageCount(tempFile.Name())
		var keyframes []KeyframeResponse

		for pageNum := 1; pageNum <= pageCount; pageNum++ {
			cmd := exec.Command("pdftotext", "-f", fmt.Sprintf("%d", pageNum), "-l", fmt.Sprintf("%d", pageNum), tempFile.Name(), "-")
			out, err := cmd.Output()
			if err != nil || len(strings.TrimSpace(string(out))) == 0 {
				continue
			}
			pageText := string(out)
			if len(strings.Fields(pageText)) < 30 {
				continue
			}
			keyframes = append(keyframes, KeyframeResponse{
				Offset: uint64(pageNum),
				PHash:  simhash(pageText),
				Text:   pageText,
			})
		}

		if len(keyframes) == 0 {
			// We won't error out yet, because there might be images!
		}

		// 2. Image Extraction (Extracts embedded photos inside the PDF)
		imgCmd := exec.Command("pdfimages", "-j", tempFile.Name(), filepath.Join(tempDir, "img"))
		imgCmd.Run() // Ignore errors, it might just have no images

		files, _ := os.ReadDir(tempDir)
		for _, f := range files {
			if !strings.HasPrefix(f.Name(), "img-") {
				continue
			}
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

			semanticHash, aiConf := getSemanticHash(framePath)

			keyframes = append(keyframes, KeyframeResponse{
				Offset:            0, // Embedded images don't map perfectly to page offsets with pdfimages
				PHash:             hash.GetHash(),
				SemanticHash:      semanticHash,
				AiConfidenceScore: aiConf,
			})
		}

		if len(keyframes) == 0 {
			http.Error(w, "failed to extract pages or images from document", http.StatusInternalServerError)
			return
		}

		wholeCmd := exec.Command("pdftotext", tempFile.Name(), "-")
		wholeOut, _ := wholeCmd.Output()
		mainPHash := simhash(string(wholeOut))
		if mainPHash == 0 {
			mainPHash = keyframes[0].PHash
		}

		res := HashResponse{
			SHA256:    sha256Hex,
			PHash:     mainPHash,
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

			semanticHash, aiConf := getSemanticHash(framePath)

			keyframes = append(keyframes, KeyframeResponse{
				Offset:            uint64(idx),
				PHash:             hash.GetHash(),
				SemanticHash:      semanticHash,
				AiConfidenceScore: aiConf,
			})
		}

		if len(keyframes) == 0 {
			http.Error(w, "failed to extract keyframes", http.StatusInternalServerError)
			return
		}

		res := HashResponse{
			SHA256:       sha256Hex,
			PHash:        keyframes[0].PHash,
			SemanticHash: keyframes[0].SemanticHash,
			MediaType:    "video",
			Keyframes:    keyframes,
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(res)
		return
	}

}

func getSemanticHash(filePath string) ([]float32, float32) {
	file, err := os.Open(filePath)
	if err != nil {
		log.Printf("Failed to open file for semantic hash: %v", err)
		return nil, 0.0
	}
	defer file.Close()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("file", filepath.Base(filePath))
	if err != nil {
		log.Printf("Failed to create form file: %v", err)
		return nil, 0.0
	}
	io.Copy(part, file)
	writer.Close()

	req, err := http.NewRequest("POST", "http://host.docker.internal:8082/api/v1/embed", body)
	if err != nil {
		log.Printf("Failed to create request: %v", err)
		return nil, 0.0
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Failed to call ai_service: %v", err)
		return nil, 0.0
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("ai_service returned status %d", resp.StatusCode)
		return nil, 0.0
	}

	var result struct {
		SemanticHash      []float32 `json:"semantic_hash"`
		AiConfidenceScore float32   `json:"ai_confidence_score"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		log.Printf("Failed to decode ai_service response: %v", err)
		return nil, 0.0
	}
	return result.SemanticHash, result.AiConfidenceScore
}

func getPDFPageCount(pdfPath string) int {
	cmd := exec.Command("pdfinfo", pdfPath)
	out, err := cmd.Output()
	if err != nil {
		return 1
	}
	lines := strings.Split(string(out), "\n")
	for _, line := range lines {
		if strings.HasPrefix(line, "Pages:") {
			var count int
			_, err := fmt.Sscanf(line, "Pages: %d", &count)
			if err == nil {
				return count
			}
		}
	}
	return 1
}

func simhash(text string) uint64 {
	words := strings.Fields(strings.ToLower(text))
	if len(words) == 0 {
		return 0
	}

	v := make([]int, 64)
	for _, word := range words {
		h := fnv1a64(word)
		for i := 0; i < 64; i++ {
			if (h & (1 << uint(i))) != 0 {
				v[i]++
			} else {
				v[i]--
			}
		}
	}

	var fingerPrint uint64
	for i := 0; i < 64; i++ {
		if v[i] > 0 {
			fingerPrint |= (1 << uint(i))
		}
	}
	return fingerPrint
}

func fnv1a64(s string) uint64 {
	var hash uint64 = 14695981039346656037
	for i := 0; i < len(s); i++ {
		hash ^= uint64(s[i])
		hash *= 1099511628211
	}
	return hash
}
