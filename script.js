// Markdown Renderer - Main JavaScript File

// ============================================
// 【新功能】TOC 與捲動偵測的快取變數
// ============================================
let currentScrollSpyHeadings = [];
let currentScrollSpyContainer = null;
let tocPanel = null;
let tocTooltip = null;


// ============================================
// Script Loading
// ============================================

/**
 * Load the Mathpix Markdown package
 * @returns {Promise} Resolves when script is loaded successfully
 */
function loadScript() {
    return new Promise((resolve, reject) => {
        let script = document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/npm/mathpix-markdown-it@2/es5/bundle.js";
        document.head.append(script);

        script.onload = function () {
            const isLoaded = window.loadMathJax();
            if (isLoaded) {
                console.log('Mathpix Markdown loaded successfully!');
                resolve();
            } else {
                reject(new Error('Failed to load MathJax'));
            }
        };

        script.onerror = function () {
            reject(new Error('Failed to load Mathpix Markdown'));
        };
    });
}

/**
 * 【新功能】Initialize Mermaid
 */
function initMermaid() {
    if (window.mermaid) {
        window.mermaid.initialize({ startOnLoad: false, theme: 'default' });
    }
}

/**
 * 【新功能】Process Mermaid Diagrams
 * Finds standard markdown code blocks for mermaid and converts them to divs for rendering
 * @param {HTMLElement} container - The container to search for mermaid blocks
 */
function renderMermaid(container) {
    if (!window.mermaid || !container) return;

    // Support for standard markdown-it output (pre > code.language-mermaid)
    const mermaidBlocks = container.querySelectorAll('.language-mermaid');
    
    mermaidBlocks.forEach((block) => {
        const content = block.innerText || block.textContent;
        
        // Create a new div for mermaid
        const div = document.createElement('div');
        div.className = 'mermaid';
        div.textContent = content;
        
        // Replace the <pre> tag (parent of code) with the new div
        // If logic differs based on parser, we might need to adjust checks
        const pre = block.closest('pre');
        if (pre) {
            pre.parentNode.replaceChild(div, pre);
        } else {
            block.parentNode.replaceChild(div, block);
        }
    });

    // Run mermaid rendering
    try {
        window.mermaid.run({
            querySelector: '.mermaid',
            nodes: container.querySelectorAll('.mermaid')
        });
    } catch (e) {
        console.warn('Mermaid rendering error:', e);
    }
}

// ============================================
// Notification System
// ============================================

function showNotification(message, type = 'info') {
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    let iconPath = '';
    if (type === 'success') {
        iconPath = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />';
    } else if (type === 'error') {
        iconPath = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />';
    } else {
        iconPath = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />';
    }

    notification.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="notification-icon" fill="none" viewBox="0 0 24" stroke="currentColor">
          ${iconPath}
        </svg>
        <div>${message}</div>
    `;

    const editorContainer = document.querySelector('.editor-container');
    editorContainer.insertBefore(notification, editorContainer.firstChild);

    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// ============================================
// Markdown Conversion
// ============================================

function convertMarkdown(markdownText) {
    if (!markdownText) {
        return '';
    }

    try {
        const options = {
            htmlTags: true
        };

        const html = window.markdownToHTML(markdownText, options);
        return html;
    } catch (error) {
        showNotification(`Error converting markdown: ${error.message}`, 'error');
        console.error('Conversion error:', error);
        return `<div style="color: red; padding: 1rem;">Error converting markdown: ${error.message}</div>`;
    }
}

// ============================================
// 【修復】內部連結處理
// ============================================

function slugify(text) {
    return (text || '').trim().toLowerCase()
        .replace(/\s+/g, '-')           
        .replace(/[^\w\u4e00-\u9fa5-]/g, '') 
        .replace(/-+/g, '-');           
}

function fixInternalLinks(container) {
    if (!container) return;

    const links = container.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.removeAttribute('target');
        link.removeAttribute('rel');

        link.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopImmediatePropagation(); 
            
            try {
                const href = link.getAttribute('href');
                if (href.length <= 1) return; 

                const targetId = decodeURIComponent(href.substring(1));
                let targetElement = null;
                try {
                    targetElement = container.querySelector(`#${CSS.escape(targetId)}`);
                } catch (qsError) {
                    console.warn('QuerySelector failed for ID:', targetId, qsError);
                }

                if (!targetElement) {
                    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
                    const cleanTarget = targetId.replace(/-/g, '').toLowerCase();

                    for (let h of headings) {
                        if (h.dataset.slug === targetId) {
                            targetElement = h;
                            break;
                        }
                        const hSlug = slugify(h.textContent);
                        if (hSlug === targetId) {
                            targetElement = h;
                            break;
                        }
                        const cleanH = hSlug.replace(/-/g, '');
                        if (cleanTarget && cleanH && (cleanTarget === cleanH)) {
                            targetElement = h;
                            break;
                        }
                    }
                }

                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    history.replaceState(null, null, '#' + targetId);
                }
            } catch (err) {
                console.error('Error handling link click:', err);
            }
        });
    });
}


// ============================================
// Fullscreen Functionality
// ============================================

function enterFullscreen() {
    const overlay = document.getElementById('fullscreen-overlay');
    const fullscreenContent = document.getElementById('fullscreen-content');
    const outputContent = document.getElementById('output');
    
    const sourceContent = document.getElementById('source').textContent;
    const currentHtml = convertMarkdown(sourceContent);
    outputContent.innerHTML = currentHtml;
    fullscreenContent.innerHTML = currentHtml;

    overlay.classList.add('active');

    const fullscreenBtn = document.getElementById('fullscreen-btn');
    fullscreenBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 9V4a2 2 0 00-2-2H3m6 5l6-6m0 18v-5a2 2 0 012-2h4m-6-5l6 6" />
        </svg>
        Exit Fullscreen
    `;

    document.addEventListener('keydown', handleEscapeKey);

    fullscreenContent.addEventListener('scroll', handleScrollEvents);
    
    // Process standard items
    generateTOC('#fullscreen-content');
    fixInternalLinks(fullscreenContent);
    // 【新功能】Render Mermaid in fullscreen
    renderMermaid(fullscreenContent);
    
    handleScrollEvents({ target: fullscreenContent });
}

function exitFullscreen() {
    const overlay = document.getElementById('fullscreen-overlay');
    const fullscreenContent = document.getElementById('fullscreen-content');
    const outputContent = document.getElementById('output');

    overlay.classList.remove('active');

    const fullscreenBtn = document.getElementById('fullscreen-btn');
    fullscreenBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
            viewBox="0 0 16 16">
            <path
                d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z" />
        </svg>
        Fullscreen
    `;

    document.removeEventListener('keydown', handleEscapeKey);
    fullscreenContent.removeEventListener('scroll', handleScrollEvents);
    
    // Re-process standard items for main view
    generateTOC('#output');
    fixInternalLinks(outputContent);
    renderMermaid(outputContent); // Ensure mermaid is rendered in main view
    handleScrollEvents({ target: outputContent });
}

function toggleFullscreen() {
    const overlay = document.getElementById('fullscreen-overlay');
    if (overlay.classList.contains('active')) {
        exitFullscreen();
    } else {
        enterFullscreen();
    }
}

function handleEscapeKey(event) {
    if (event.key === 'Escape') {
        exitFullscreen();
    }
}

// ============================================
// File Processing
// ============================================

function processFile(file) {
    if (!file) return;

    const fileNameElement = document.querySelector('.file-name');
    fileNameElement.textContent = file.name;

    const reader = new FileReader();

    reader.onload = function (event) {
        const markdownText = event.target.result;

        const sourceElement = document.getElementById('source');
        sourceElement.textContent = markdownText;

        const placeholder = document.getElementById('placeholder');
        if (placeholder) {
            placeholder.remove();
        }

        const outputElement = document.getElementById('output');
        outputElement.innerHTML = convertMarkdown(markdownText);

        document.getElementById('copy-btn').disabled = false;
        document.getElementById('fullscreen-btn').disabled = false;
        document.getElementById('refresh-btn').disabled = false;
        // 【新功能】Enable print button
        document.getElementById('print-btn').disabled = false;

        showNotification(`File "${file.name}" loaded successfully.`, 'success');

        generateTOC('#output');
        fixInternalLinks(outputElement);
        // 【新功能】Render Mermaid
        renderMermaid(outputElement);
        
        handleScrollEvents({ target: outputElement });
    };

    reader.onerror = function () {
        showNotification(`Failed to read file "${file.name}".`, 'error');
    };

    reader.readAsText(file);
}

// ============================================
// Clipboard Operations
// ============================================

function copyHTML() {
    const output = document.getElementById('output');
    const tempTextarea = document.createElement('textarea');
    tempTextarea.value = output.innerHTML;
    document.body.appendChild(tempTextarea);
    tempTextarea.select();
    document.execCommand('copy');
    document.body.removeChild(tempTextarea);

    const copyBtn = document.getElementById('copy-btn');
    const originalText = copyBtn.innerHTML;
    copyBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        Copied!
    `;
    setTimeout(() => {
        copyBtn.innerHTML = originalText;
    }, 2000);
}

// ============================================
// Example Content
// ============================================

function loadExample() {
    const exampleMarkdown = `# 線性代數學習筆記

$x = {-b \\pm \\sqrt{b^2-4ac} \\over 2a}$

好的,這就來為你鉅細靡遺地「開箱」Strang教授的《Introduction to Linear Algebra》第五版的第五章:**行列式 (Determinants)**!

---

## 第五章: 行列式 (Determinants)

### 5.1 矩陣的「魔法數字」
嘿,各位線性代數的戰友們!我們已經一起闖過了矩陣運算、解線性方程組、向量空間等重要關卡。今天,我們要來探索一個既神秘又充滿力量的概念——**行列式 (Determinant)**。

### 5.2 測試 Mermaid 圖表 (新功能)

\`\`\`mermaid
graph TD
    A[開始] --> B{是否喜歡?}
    B -- Yes --> C[太棒了!]
    B -- No --> D[我們會改進]
    C --> E[分享給朋友]
    D --> E
\`\`\`

## 第六章: 應用 (Applications)

這只是一個範例標題。

### 6.1 克拉瑪法則 (Cramer's Rule)
雖然計算量大,但克拉瑪法則在理論上很有趣。
`;

    const sourceElement = document.getElementById('source');
    sourceElement.textContent = exampleMarkdown;

    const placeholder = document.getElementById('placeholder');
    if (placeholder) {
        placeholder.remove();
    }

    const outputElement = document.getElementById('output');
    outputElement.innerHTML = convertMarkdown(exampleMarkdown);

    const fileNameElement = document.querySelector('.file-name');
    fileNameElement.textContent = "example.md";

    document.getElementById('copy-btn').disabled = false;
    document.getElementById('fullscreen-btn').disabled = false;
    document.getElementById('refresh-btn').disabled = false;
    // 【新功能】Enable print button
    document.getElementById('print-btn').disabled = false;

    showNotification('Example markdown loaded successfully.', 'success');

    generateTOC('#output');
    fixInternalLinks(outputElement);
    // 【新功能】Render Mermaid
    renderMermaid(outputElement);
    
    handleScrollEvents({ target: outputElement });
}

// ============================================
// Tab Management
// ============================================

function switchTab(tabId) {
    const sourceTab = document.getElementById('source-tab');
    const previewTab = document.getElementById('preview-tab');
    const source = document.getElementById('source');
    const output = document.getElementById('output');

    if (tabId === 'source') {
        sourceTab.classList.add('active');
        previewTab.classList.remove('active');
        source.classList.add('active');
        output.classList.remove('active');
    } else {
        sourceTab.classList.remove('active');
        previewTab.classList.add('active');
        source.classList.remove('active');
        output.classList.add('active');
    }
}

// ============================================
// Theme Management
// ============================================

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    updateThemeToggle(theme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
}

function updateThemeToggle(theme) {
    const themeToggle = document.getElementById('theme-toggle');
    
    if (theme === 'dark') {
        themeToggle.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span id="theme-text">Light</span>
        `;
    } else {
        themeToggle.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            <span id="theme-text">Dark</span>
        `;
    }
}

// ============================================
// Reading Progress & TOC
// ============================================

function handleScrollEvents(event) {
    try {
        updateReadingProgress(event);
        updateScrollSpy(event);
    } catch (e) {
        console.warn('Scroll event error suppressed:', e);
    }
}

function updateReadingProgress(event) {
    try {
        const target = event ? event.target : null;
        
        if (!target || target.nodeType !== 1 || typeof target.scrollTop === 'undefined') {
            return;
        }

        const scrollHeight = target.scrollHeight - target.clientHeight;
        const scrollTop = target.scrollTop;
        
        const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
        
        const progressBar = document.getElementById('reading-progress-bar');
        if (progressBar) {
            progressBar.style.width = progress + '%';
        }
    } catch (e) {
    }
}

function generateTOC(contentSelector) {
    if (!tocPanel) {
        tocPanel = document.getElementById('toc-panel');
    }
    if (!tocTooltip) {
        tocTooltip = document.getElementById('toc-tooltip');
    }
    
    const content = document.querySelector(contentSelector);
    if (!content || !tocPanel) return;

    tocPanel.innerHTML = '';
    
    const headings = content.querySelectorAll('h1, h2, h3');
    
    if (headings.length < 2) {
        tocPanel.style.display = 'none';
        currentScrollSpyHeadings = []; 
        return;
    }

    tocPanel.style.display = 'flex';

    headings.forEach((heading, index) => {
        let safeId = slugify(heading.textContent);
        
        let uniqueId = safeId;
        let counter = 1;
        
        while (content.querySelector('#' + CSS.escape(uniqueId)) && content.querySelector('#' + CSS.escape(uniqueId)) !== heading) {
            uniqueId = `${safeId}-${counter}`;
            counter++;
        }
        
        if (!heading.id) {
            heading.id = uniqueId;
        } else {
            heading.dataset.slug = uniqueId;
        }

        let displayId = heading.id;

        const link = document.createElement('a');
        link.className = 'toc-link toc-' + heading.tagName.toLowerCase();
        link.textContent = heading.textContent;
        link.href = '#' + displayId;
        link.dataset.headingId = displayId;

        link.onclick = (e) => {
            e.preventDefault();
            heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
        
        if (tocTooltip) {
            link.addEventListener('mouseenter', () => {
                tocTooltip.textContent = heading.textContent;
                const rect = link.getBoundingClientRect();
                const centerY = rect.top + (rect.height / 2);
                tocTooltip.style.top = centerY + 'px';
                tocTooltip.style.left = (rect.right + 12) + 'px';
                tocTooltip.classList.add('visible');
            });

            link.addEventListener('mouseleave', () => {
                tocTooltip.classList.remove('visible');
            });
        }
        
        tocPanel.appendChild(link);
    });

    currentScrollSpyHeadings = Array.from(headings);
    currentScrollSpyContainer = content;
}

function updateScrollSpy(event) {
    if (!currentScrollSpyHeadings || currentScrollSpyHeadings.length < 2 || !currentScrollSpyContainer || !tocPanel) {
        return;
    }

    const containerTop = currentScrollSpyContainer.getBoundingClientRect().top;
    const offset = containerTop + 150; 

    let activeId = null;

    for (let i = currentScrollSpyHeadings.length - 1; i >= 0; i--) {
        const heading = currentScrollSpyHeadings[i];
        const rect = heading.getBoundingClientRect();

        if (rect.top <= offset) {
            activeId = heading.id;
            break;
        }
    }

    const tocLinks = tocPanel.querySelectorAll('.toc-link');
    tocLinks.forEach(link => {
        if (link.dataset.headingId === activeId) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// ============================================
// 【新功能】Drag & Drop Initialization
// ============================================

function initDragAndDrop() {
    const body = document.body;
    const overlay = document.getElementById('drop-overlay');
    
    if (!overlay) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        body.addEventListener(eventName, (e) => { 
            e.preventDefault(); 
            e.stopPropagation(); 
        }, false);
    });

    body.addEventListener('dragenter', () => {
        body.classList.add('dragging');
    });

    // Ensure leave only triggers when leaving the overlay or window
    overlay.addEventListener('dragleave', (e) => {
        if (e.target === overlay) {
            body.classList.remove('dragging');
        }
    });
    
    body.addEventListener('drop', (e) => {
        body.classList.remove('dragging');
        const file = e.dataTransfer.files[0];
        if (file) {
            processFile(file);
        }
    });
}


// ============================================
// Application Initialization
// ============================================

async function init() {
    try {
        initTheme();
        await loadScript();
        // 【新功能】
        initMermaid();
        initDragAndDrop();

        const sourceEditor = document.getElementById('source');
        sourceEditor.setAttribute('contenteditable', 'true');

        document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
        
        document.getElementById('file-input').addEventListener('change', event => {
            const file = event.target.files[0];
            if (file) {
                processFile(file);
            }
        });

        document.getElementById('example-btn').addEventListener('click', loadExample);
        document.getElementById('copy-btn').addEventListener('click', copyHTML);
        document.getElementById('fullscreen-btn').addEventListener('click', toggleFullscreen);
        document.getElementById('exit-fullscreen-btn').addEventListener('click', exitFullscreen);
        
        // 【新功能】Print Button
        const printBtn = document.getElementById('print-btn');
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                window.print();
            });
        }

        document.getElementById('refresh-btn').addEventListener('click', () => {
            const source = document.getElementById('source').textContent;
            const output = document.getElementById('output');
            output.innerHTML = convertMarkdown(source);
            
            generateTOC('#output');
            fixInternalLinks(output);
            // 【新功能】Render Mermaid on refresh
            renderMermaid(output);
            
            showNotification('Preview refreshed.', 'info');
        });

        document.getElementById('source-tab').addEventListener('click', () => switchTab('source'));
        document.getElementById('preview-tab').addEventListener('click', () => switchTab('preview'));

        document.getElementById('output').addEventListener('scroll', handleScrollEvents);

    } catch (error) {
        console.error('Initialization error:', error);
        showNotification(`Failed to initialize: ${error.message}`, 'error');
    }
}

// Start the application when page loads
document.addEventListener('DOMContentLoaded', init);