document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');
    const processingPanel = document.getElementById('processing-panel');
    const resultDashboard = document.getElementById('result-dashboard');
    const previewViewport = document.getElementById('preview-viewport');
    const badgeMediaType = document.getElementById('badge-media-type');
    const hashSha256 = document.getElementById('hash-sha256');
    const hashPhashDec = document.getElementById('hash-phash-dec');
    const hashPhashHex = document.getElementById('hash-phash-hex');
    const keyframesSection = document.getElementById('keyframes-section');
    const keyframesTimeline = document.getElementById('keyframes-timeline');
    const rawJsonCode = document.getElementById('raw-json-code');
    const copySha256 = document.getElementById('copy-sha256');
    const copyPhashDec = document.getElementById('copy-phash-dec');
    const copyPhashHex = document.getElementById('copy-phash-hex');
    const copyJson = document.getElementById('copy-json');
    const resetBtn = document.getElementById('reset-btn');

    let currentFile = null;

    dropZone.addEventListener('click', () => fileInput.click());

    browseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    function handleFile(file) {
        currentFile = file;
        showLoading();
        uploadAndProcess(file);
    }

    function showLoading() {
        dropZone.classList.add('hidden');
        processingPanel.classList.remove('hidden');
        resultDashboard.classList.add('hidden');
    }

    function showDashboard() {
        processingPanel.classList.add('hidden');
        resultDashboard.classList.remove('hidden');
    }

    function resetApp() {
        currentFile = null;
        fileInput.value = '';
        previewViewport.innerHTML = '';
        keyframesTimeline.innerHTML = '';
        dropZone.classList.remove('hidden');
        processingPanel.classList.add('hidden');
        resultDashboard.classList.add('hidden');
        keyframesSection.classList.add('hidden');
    }

    resetBtn.addEventListener('click', resetApp);

    function uploadAndProcess(file) {
        const formData = new FormData();
        formData.append('file', file);

        fetch('/api/v1/hash', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => { throw new Error(text) });
            }
            return response.json();
        })
        .then(data => {
            renderPreview(file);
            renderResults(data);
            showDashboard();
        })
        .catch(err => {
            alert('Error processing file: ' + err.message);
            resetApp();
        });
    }

    function renderPreview(file) {
        previewViewport.innerHTML = '';
        const objectUrl = URL.createObjectURL(file);

        if (file.type.startsWith('video/')) {
            const video = document.createElement('video');
            video.src = objectUrl;
            video.className = 'preview-video';
            video.controls = true;
            video.autoplay = true;
            video.muted = true;
            video.loop = true;
            previewViewport.appendChild(video);
        } else {
            const img = document.createElement('img');
            img.src = objectUrl;
            img.className = 'preview-image';
            previewViewport.appendChild(img);
        }
    }

    function renderResults(data) {
        badgeMediaType.textContent = data.media_type;
        hashSha256.textContent = data.sha256;
        hashPhashDec.textContent = data.phash;
        hashPhashHex.textContent = '0x' + bigIntToHex(data.phash);

        if (data.media_type === 'video' && data.keyframes && data.keyframes.length > 0) {
            keyframesSection.classList.remove('hidden');
            keyframesTimeline.innerHTML = '';

            data.keyframes.forEach(kf => {
                const node = document.createElement('div');
                node.className = 'keyframe-node';

                const timeLabel = document.createElement('span');
                timeLabel.className = 'kf-time';
                timeLabel.textContent = `Offset: ${kf.offset}s`;

                const hashHex = document.createElement('span');
                hashHex.className = 'kf-hash';
                hashHex.textContent = '0x' + bigIntToHex(kf.phash);
                hashHex.title = `Dec: ${kf.phash}`;

                node.appendChild(timeLabel);
                node.appendChild(hashHex);
                keyframesTimeline.appendChild(node);
            });
        } else {
            keyframesSection.classList.add('hidden');
        }

        rawJsonCode.textContent = JSON.stringify(data, null, 2);
    }

    function bigIntToHex(strVal) {
        try {
            const big = BigInt(strVal);
            return big.toString(16).toUpperCase().padStart(16, '0');
        } catch {
            return strVal;
        }
    }

    setupCopy(copySha256, () => hashSha256.textContent);
    setupCopy(copyPhashDec, () => hashPhashDec.textContent);
    setupCopy(copyPhashHex, () => hashPhashHex.textContent);
    setupCopy(copyJson, () => rawJsonCode.textContent, true);

    function setupCopy(button, valueGetter, isTextBtn = false) {
        button.addEventListener('click', () => {
            const text = valueGetter();
            navigator.clipboard.writeText(text).then(() => {
                const originalHtml = button.innerHTML;
                if (isTextBtn) {
                    button.textContent = 'Copied!';
                } else {
                    button.innerHTML = '<svg fill="none" stroke="#10b981" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
                }
                setTimeout(() => {
                    if (isTextBtn) {
                        button.textContent = originalHtml;
                    } else {
                        button.innerHTML = originalHtml;
                    }
                }, 1500);
            });
        });
    }
});
