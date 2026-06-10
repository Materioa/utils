(function () {
    // Avoid multiple injections
    if (window._scrappyInjected) return;
    window._scrappyInjected = true;

    window.pdfList = [];
    let currentTopic = '';

    window._scrappyCancelled = false;
    window._scrappyAutoScraping = false;

    // --- Create Floating UI ---
    function createUI() {
        const container = document.createElement('div');
        container.id = 'scrappy-container';
        container.innerHTML = `
            <style>
                #scrappy-container {
                    position: fixed;
                    bottom: 24px;
                    left: 24px;
                    z-index: 2147483647;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-family: "PP Mori SemiBold","PP Mori", -apple-system, BlinkMacSystemFont, sans-serif !important;
                }
                #scrappy-container * {
                    font-family: inherit !important;
                }
                #scrappy-floating-btn {
                    background: #383838;
                    color: white;
                    padding: 12px 24px;
                    border-radius: 9999px;
                    font-size: 14px;
                    font-weight: 500;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.2);
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    transition: all 0.3s ease;
                    user-select: none;
                    max-width: 80vw;
                    border: 1px solid rgba(255,255,255,0.15);
                    cursor: pointer;
                }
                .scrappy-spinner {
                    width: 24px;
                    height: 24px;
                    display: none;
                    flex-shrink: 0;
                    color: #fff;
                }
                #scrappy-text {
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .scrappy-shimmer {
                    background: linear-gradient(90deg, #d4af37 0%, #c0c0c0 33%, #4a90e2 66%, #d4af37 100%);
                    background-size: 300% auto;
                    color: transparent;
                    -webkit-background-clip: text;
                    background-clip: text;
                    animation: scrappy-shimmer-anim 2.5s linear infinite;
                }
                @keyframes scrappy-shimmer-anim {
                    from { background-position: 0% center; }
                    to { background-position: -300% center; }
                }
                .scrappy-circle-btn {
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    background: #383838;
                    color: white;
                    display: none;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.4);
                    border: 1px solid rgba(255,255,255,0.15);
                    transition: all 0.2s;
                    flex-shrink: 0;
                }
                .scrappy-circle-btn:hover {
                    background: #444444;
                    transform: translateY(-2px);
                }
            </style>
            <div id="scrappy-floating-btn">
                <div class="scrappy-spinner" id="scrappy-spinner"></div>
                <span id="scrappy-text">Start Scraping</span>
            </div>
            <div id="scrappy-circle-download" class="scrappy-circle-btn" title="Download Opened File">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            </div>
            <div id="scrappy-circle-stop" class="scrappy-circle-btn" title="Stop Scraping">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><rect x="6" y="6" width="12" height="12"/></svg>
            </div>
        `;
        document.body.appendChild(container);

        const btn = document.getElementById('scrappy-floating-btn');
        const textNode = document.getElementById('scrappy-text');
        const spinnerNode = document.getElementById('scrappy-spinner');
        const downloadCircle = document.getElementById('scrappy-circle-download');
        const stopCircle = document.getElementById('scrappy-circle-stop');

        let cancelSpinner = null;

        setInterval(() => {
            if (!window._scrappyAutoScraping && downloadCircle.style.display === 'flex') {
                const modals = document.querySelectorAll('.ant-modal-root, .ant-modal, .modal-content, nz-modal-container');
                const hasVisibleModal = Array.from(modals).some(m => m.offsetParent !== null);
                if (!hasVisibleModal) {
                    downloadCircle.style.display = 'none';
                    textNode.innerText = 'Start Scraping';
                    textNode.classList.remove('scrappy-shimmer');
                }
            }
        }, 1000);

        return {
            btn,
            downloadCircle,
            stopCircle,
            update: function (msg, isProcessing = true) {
                textNode.innerText = msg;
                if (isProcessing) {
                    spinnerNode.style.display = 'block';
                    textNode.classList.add('scrappy-shimmer');
                    if (!cancelSpinner) cancelSpinner = startCustomSpinner(spinnerNode);
                } else {
                    spinnerNode.style.display = 'none';
                    textNode.classList.remove('scrappy-shimmer');
                    if (cancelSpinner) {
                        cancelSpinner();
                        cancelSpinner = null;
                        spinnerNode.innerHTML = '';
                    }
                }
            },
            showDownloadCircle: function (show) {
                downloadCircle.style.display = show ? 'flex' : 'none';
            },
            showStopCircle: function (show) {
                stopCircle.style.display = show ? 'flex' : 'none';
            }
        };
    }

    function startCustomSpinner(container) {
        const config = {
            rotate: true,
            particleCount: 140,
            trailSpan: 0.38,
            durationMs: 4600,
            rotationDurationMs: 28000,
            pulseDurationMs: 4200,
            strokeWidth: 5.5,
            baseRadius: 7,
            detailAmplitude: 3,
            petalCount: 7,
            curveScale: 3.9,
            point(progress, detailScale, config) {
                const t = progress * Math.PI * 2;
                const petals = Math.round(config.petalCount);
                const x = config.baseRadius * Math.cos(t) - config.detailAmplitude * detailScale * Math.cos(petals * t);
                const y = config.baseRadius * Math.sin(t) - config.detailAmplitude * detailScale * Math.sin(petals * t);
                return { x: 50 + x * config.curveScale, y: 50 + y * config.curveScale };
            }
        };

        container.innerHTML = `
            <svg viewBox="0 0 100 100" fill="none" aria-hidden="true" style="width:100%; height:100%; overflow:visible;">
                <g class="spin-group">
                    <path class="spin-path" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" opacity="0.1" stroke-width="${config.strokeWidth}"></path>
                </g>
            </svg>
        `;
        const group = container.querySelector('.spin-group');
        const path = container.querySelector('.spin-path');
        const SVG_NS = 'http://www.w3.org/2000/svg';

        const particles = Array.from({ length: config.particleCount }, () => {
            const circle = document.createElementNS(SVG_NS, 'circle');
            circle.setAttribute('fill', 'currentColor');
            group.appendChild(circle);
            return circle;
        });

        function normalizeProgress(progress) { return ((progress % 1) + 1) % 1; }
        function getDetailScale(time) {
            const pulseProgress = (time % config.pulseDurationMs) / config.pulseDurationMs;
            const pulseAngle = pulseProgress * Math.PI * 2;
            return 0.52 + ((Math.sin(pulseAngle + 0.55) + 1) / 2) * 0.48;
        }
        function getRotation(time) {
            if (!config.rotate) return 0;
            return -((time % config.rotationDurationMs) / config.rotationDurationMs) * 360;
        }
        function buildPath(detailScale, steps = 120) {
            return Array.from({ length: steps + 1 }, (_, index) => {
                const point = config.point(index / steps, detailScale, config);
                return `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
            }).join(' ');
        }
        function getParticle(index, progress, detailScale) {
            const tailOffset = index / (config.particleCount - 1);
            const point = config.point(normalizeProgress(progress - tailOffset * config.trailSpan), detailScale, config);
            const fade = Math.pow(1 - tailOffset, 0.56);
            return { x: point.x, y: point.y, radius: 0.9 + fade * 2.7, opacity: 0.04 + fade * 0.96 };
        }

        let animationId;
        const startedAt = performance.now();
        function render(now) {
            const time = now - startedAt;
            const progress = (time % config.durationMs) / config.durationMs;
            const detailScale = getDetailScale(time);
            group.setAttribute('transform', `rotate(${getRotation(time)} 50 50)`);
            path.setAttribute('d', buildPath(detailScale));
            particles.forEach((node, index) => {
                const particle = getParticle(index, progress, detailScale);
                node.setAttribute('cx', particle.x.toFixed(2));
                node.setAttribute('cy', particle.y.toFixed(2));
                node.setAttribute('r', particle.radius.toFixed(2));
                node.setAttribute('opacity', particle.opacity.toFixed(3));
            });
            animationId = requestAnimationFrame(render);
        }
        animationId = requestAnimationFrame(render);
        return () => cancelAnimationFrame(animationId);
    }

    const ui = createUI();

    // --- 1. Network Interception (Fetch & XHR) ---
    const handleUrl = (url) => {
        const urlStr = typeof url === 'string' ? url : url?.url || '';

        // 1. Check for PPTX images format (e.g. /important/1779942255466-0.jpg)
        const imgMatch = urlStr.match(/\/([^\/]+)-(\d+)\.(jpg|jpeg|png|webp)(\?.*)?$/i);
        if (imgMatch) {
            const fileId = imgMatch[1];
            let existing = window.pdfList.find(p => p.fileId === fileId);
            if (existing) {
                // Prevent duplicate image slices by comparing base URLs
                const baseImgUrl = urlStr.split('?')[0];
                if (!existing.images.find(img => img.split('?')[0] === baseImgUrl)) {
                    existing.images.push(urlStr);
                }
            } else {
                window.pdfList.push({
                    topic: currentTopic,
                    filename: fileId + '_PPT',
                    fileId: fileId,
                    images: [urlStr],
                    type: 'pptx-images'
                });
                if (window._scrappyAutoScraping) {
                    ui.update(`Found PPT images: ${fileId}`, true);
                } else {
                    ui.update(`Opened ${fileId}_PPT`, false);
                    ui.showDownloadCircle(true);
                }
            }
            return;
        }

        // 2. Check for google storage OR edorer storage OR generic pdf extension
        if (urlStr.includes('storage.googleapis.com') || urlStr.includes('edorer-parul-elearning.sgp1.digitaloceanspaces.com') || urlStr.includes('.pdf')) {
            const baseUrl = urlStr.split('?')[0];
            // Check for duplicate files by comparing base url (ignoring query params)
            if (!window.pdfList.find(p => p.url && p.url.split('?')[0] === baseUrl)) {
                // clean up filename
                let filename = baseUrl.split('/').pop();
                try { filename = decodeURIComponent(filename); } catch (e) { }
                // remove "37" substring if it's a UUID prefix, otherwise keep full name
                if (filename.length > 40) filename = filename.substring(37);

                window.pdfList.push({ topic: currentTopic, filename, url: urlStr, type: 'pdf' });
                if (window._scrappyAutoScraping) {
                    ui.update(`Found PDF: ${filename}`, true);
                } else {
                    ui.update(`Opened ${filename}`, false);
                    ui.showDownloadCircle(true);
                }
            }
        }
    };

    const origFetch = window.fetch;
    window.fetch = function (url, ...args) {
        handleUrl(url);
        return origFetch.apply(this, [url, ...args]);
    };

    const origXHR = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
        handleUrl(url);
        return origXHR.apply(this, arguments);
    };

    // --- 1b. Network Interception (PerformanceObserver for <img> tags) ---
    if (window.PerformanceObserver) {
        const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach(entry => handleUrl(entry.name));
        });
        observer.observe({ entryTypes: ['resource'] });
    }
    // Check already loaded resources
    performance.getEntriesByType('resource').forEach(entry => handleUrl(entry.name));

    const wait = ms => new Promise(r => setTimeout(r, ms));

    function closeCurrentModal() {
        const closeSelectors = [
            'i.icon-close', '.ant-modal-close', 'ion-button[color="danger"]',
            'button[aria-label="Close"]', '.close-button', '.modal-close'
        ];
        let closed = false;
        for (const sel of closeSelectors) {
            const el = document.querySelector(sel);
            if (el) {
                (el.closest('button, ion-button') || el).click();
                closed = true;
                break;
            }
        }
        if (!closed) {
            document.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'Escape', 'code': 'Escape', 'keyCode': 27, 'which': 27, 'bubbles': true }));
        }
    }

    ui.stopCircle.addEventListener('click', () => {
        window._scrappyCancelled = true;
        ui.update("Scraping Cancelled", false);
        ui.showStopCircle(false);
        setTimeout(() => {
            ui.update("Start Scraping", false);
        }, 3000);
    });

    ui.downloadCircle.addEventListener('click', () => {
        const latest = window.pdfList[window.pdfList.length - 1];
        if (latest) {
            const url = latest.url || latest.images[0];
            const a = document.createElement('a');
            a.href = url;
            a.download = latest.filename;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            ui.showDownloadCircle(false);
            ui.update("Start Scraping", false);
        }
    });

    async function startScraping() {
        if (window._scrappyAutoScraping) return;
        window._scrappyAutoScraping = true;
        window._scrappyCancelled = false;
        ui.showDownloadCircle(false);
        ui.showStopCircle(true);
        ui.update("Starting to scrape...", true);

        // --- 2. Iterate Panels ---
        const panels = [...document.querySelectorAll('nz-collapse-panel')];
        if (!window._scrappyCancelled) ui.update(`Found ${panels.length} panels`, true);

        for (const panel of panels) {
            if (window._scrappyCancelled) break;
            const header = panel.querySelector('.ant-collapse-header');
            const title = panel.querySelector('h6, .title, .header-text')?.innerText?.trim() || 'Untitled';

            if (header) {
                header.click();
                await wait(500);
            }

            const btns = [...panel.querySelectorAll(
                'ed-primary-button button, ed-primary-button ion-button, .ed-primary-button'
            )];

            for (let j = 0; j < btns.length; j++) {
                if (window._scrappyCancelled) break;
                currentTopic = btns.length > 1 ? `${title}_${j + 1}` : title;

                ui.update(`Opening ${currentTopic} (${j + 1}/${btns.length})...`, true);
                btns[j].click();

                await wait(1500);
                if (window._scrappyCancelled) { closeCurrentModal(); break; }

                const scrollContainers = [...document.querySelectorAll('.ant-modal-body, .scroll-content, .viewer-container, .modal-content, [overflow="auto"], [overflow-y="auto"]')];
                for (const sc of scrollContainers) {
                    sc.scrollTop = sc.scrollHeight;
                }
                await wait(500);
                if (window._scrappyCancelled) { closeCurrentModal(); break; }

                [...document.querySelectorAll('img')].forEach(img => {
                    if (img.src) handleUrl(img.src);
                });

                const latest = window.pdfList[window.pdfList.length - 1];
                if (latest) {
                    ui.update(`Opened ${latest.filename}`, true);
                }

                await wait(500);
                if (window._scrappyCancelled) { closeCurrentModal(); break; }

                closeCurrentModal();
                await wait(500);
            }

            if (header && !window._scrappyCancelled) {
                header.click();
                await wait(100);
            }
        }

        if (window._scrappyCancelled) {
            window._scrappyAutoScraping = false;
            return;
        }

        ui.update(`Captured ${window.pdfList.length} files. Packaging...`, true);

        // --- 5. Download and ZIP ---
        if (window.pdfList.length > 0) {
            try {
                const loadScript = (src) => new Promise((resolve, reject) => {
                    if (document.querySelector(`script[src="${src}"]`)) return resolve();
                    const s = document.createElement('script');
                    s.src = src;
                    s.onload = resolve;
                    s.onerror = reject;
                    document.head.appendChild(s);
                });

                ui.update("Loading ZIP and PDF engines...", true);
                await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
                await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');

                const zip = new window.JSZip();
                const { jsPDF } = window.jspdf;

                const fetchBlob = async (u) => {
                    const res = await window.fetch(u);
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    return await res.blob();
                };

                const blobToBase64 = (b) => new Promise((res, rej) => {
                    const reader = new FileReader();
                    reader.onloadend = () => res(reader.result);
                    reader.onerror = rej;
                    reader.readAsDataURL(b);
                });

                zip.file('index.json', JSON.stringify(window.pdfList, null, 2));

                for (let i = 0; i < window.pdfList.length; i++) {
                    const p = window.pdfList[i];
                    ui.update(`Packaging ${i + 1}/${window.pdfList.length}: ${p.filename}...`, true);

                    try {
                        let name = p.filename;
                        if (!name.toLowerCase().endsWith('.pdf')) name += '.pdf';

                        if (p.type === 'pdf') {
                            const blob = await fetchBlob(p.url);
                            zip.file(name, blob);
                        } else if (p.type === 'pptx-images') {
                            const doc = new jsPDF({ orientation: 'landscape' });
                            let firstPage = true;

                            const sortedImages = [...p.images].sort((a, b) => {
                                const matchA = a.match(/-(\d+)\.jpg/i);
                                const matchB = b.match(/-(\d+)\.jpg/i);
                                const numA = matchA ? parseInt(matchA[1], 10) : 0;
                                const numB = matchB ? parseInt(matchB[1], 10) : 0;
                                return numA - numB;
                            });

                            for (let imgUrl of sortedImages) {
                                try {
                                    const blob = await fetchBlob(imgUrl);
                                    const base64Img = await blobToBase64(blob);

                                    const img = new Image();
                                    img.src = base64Img;
                                    await new Promise(r => img.onload = r);

                                    if (!firstPage) doc.addPage();

                                    const pdfWidth = doc.internal.pageSize.getWidth();
                                    const pdfHeight = doc.internal.pageSize.getHeight();
                                    const imgRatio = img.width / img.height;
                                    const pdfRatio = pdfWidth / pdfHeight;

                                    let finalWidth, finalHeight;
                                    if (imgRatio > pdfRatio) {
                                        finalWidth = pdfWidth;
                                        finalHeight = pdfWidth / imgRatio;
                                    } else {
                                        finalHeight = pdfHeight;
                                        finalWidth = pdfHeight * imgRatio;
                                    }

                                    const x = (pdfWidth - finalWidth) / 2;
                                    const y = (pdfHeight - finalHeight) / 2;

                                    doc.addImage(base64Img, 'JPEG', x, y, finalWidth, finalHeight);
                                    firstPage = false;
                                } catch (err) {
                                    console.error(`Failed to process image ${imgUrl}`, err);
                                }
                            }
                            const pdfBlob = doc.output('blob');
                            zip.file(name, pdfBlob);
                        }
                    } catch (err) {
                        console.error(`Failed to process ${p.filename}`, err);
                    }
                }

                ui.update("Generating final ZIP file...", true);
                const zipBlob = await zip.generateAsync({ type: 'blob' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(zipBlob);
                a.download = `scraped_data_${Date.now()}.zip`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                ui.update("Successfully Downloaded!", false);

                // Reset button after 3 seconds
                setTimeout(() => { ui.update("Start Scraping", false); window._scrappyAutoScraping = false; ui.showStopCircle(false); }, 3000);

            } catch (err) {
                console.error("Error during ZIP generation:", err);
                ui.update("Error creating ZIP. Downloaded JSON instead.", false);

                const blob = new Blob([JSON.stringify(window.pdfList, null, 2)], { type: 'application/json' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `scraped_index_${Date.now()}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

                setTimeout(() => { ui.update("Start Scraping", false); window._scrappyAutoScraping = false; ui.showStopCircle(false); }, 3000);
            }
        } else {
            ui.update("No files found to download.", false);
            setTimeout(() => { ui.update("Start Scraping", false); window._scrappyAutoScraping = false; ui.showStopCircle(false); }, 3000);
        }
    }

    // Attach click listener to button
    ui.btn.addEventListener('click', startScraping);

    // Only show the UI when the URL matches the specific pattern
    function checkUrlVisibility() {
        const urlMatch = window.location.href.match(/^https:\/\/elearning\.paruluniversity\.ac\.in\/classrooms\/[a-zA-Z0-9_-]+\/subjects\/[a-zA-Z0-9_-]+/);
        const container = document.getElementById('scrappy-container');
        if (container) {
            container.style.display = urlMatch ? 'flex' : 'none';
        }
    }

    checkUrlVisibility();
    setInterval(checkUrlVisibility, 1000);

})();
