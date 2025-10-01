// Markdown Renderer - Main JavaScript File

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

// ============================================
// Notification System
// ============================================

/**
 * Show notification message
 * @param {string} message - The message to display
 * @param {string} type - Type of notification: 'info', 'success', or 'error'
 */
function showNotification(message, type = 'info') {
    // Remove any existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Create a new notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    // Icon based on notification type
    let iconPath = '';
    if (type === 'success') {
        iconPath = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />';
    } else if (type === 'error') {
        iconPath = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />';
    } else {
        iconPath = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />';
    }

    notification.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="notification-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          ${iconPath}
        </svg>
        <div>${message}</div>
    `;

    // Insert the notification at the top of the editor container
    const editorContainer = document.querySelector('.editor-container');
    editorContainer.insertBefore(notification, editorContainer.firstChild);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// ============================================
// Markdown Conversion
// ============================================

/**
 * Convert markdown text to HTML
 * @param {string} markdownText - The markdown text to convert
 * @returns {string} The converted HTML
 */
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
// Fullscreen Functionality
// ============================================

/**
 * Enter fullscreen mode
 */
function enterFullscreen() {
    const overlay = document.getElementById('fullscreen-overlay');
    const fullscreenContent = document.getElementById('fullscreen-content');
    const outputContent = document.getElementById('output');

    // Copy the content to fullscreen overlay
    fullscreenContent.innerHTML = outputContent.innerHTML;

    // Show the overlay
    overlay.classList.add('active');

    // Update button text
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    fullscreenBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 9V4a2 2 0 00-2-2H3m6 5l6-6m0 18v-5a2 2 0 012-2h4m-6-5l6 6" />
        </svg>
        Exit Fullscreen
    `;

    // Add keyboard listener for ESC key
    document.addEventListener('keydown', handleEscapeKey);
}

/**
 * Exit fullscreen mode
 */
function exitFullscreen() {
    const overlay = document.getElementById('fullscreen-overlay');

    // Hide the overlay
    overlay.classList.remove('active');

    // Reset button text
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    fullscreenBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
            viewBox="0 0 16 16">
            <path
                d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z" />
        </svg>
        Fullscreen
    `;

    // Remove keyboard listener
    document.removeEventListener('keydown', handleEscapeKey);
}

/**
 * Toggle fullscreen mode
 */
function toggleFullscreen() {
    const overlay = document.getElementById('fullscreen-overlay');
    if (overlay.classList.contains('active')) {
        exitFullscreen();
    } else {
        enterFullscreen();
    }
}

/**
 * Handle ESC key press to exit fullscreen
 * @param {KeyboardEvent} event - The keyboard event
 */
function handleEscapeKey(event) {
    if (event.key === 'Escape') {
        exitFullscreen();
    }
}

// ============================================
// File Processing
// ============================================

/**
 * Read and process the uploaded file
 * @param {File} file - The file to process
 */
function processFile(file) {
    if (!file) return;

    // Update file name display
    const fileNameElement = document.querySelector('.file-name');
    fileNameElement.textContent = file.name;

    // Create a reader
    const reader = new FileReader();

    reader.onload = function (event) {
        const markdownText = event.target.result;

        // Display the source
        const sourceElement = document.getElementById('source');
        sourceElement.textContent = markdownText;

        // Remove placeholder if it exists
        const placeholder = document.getElementById('placeholder');
        if (placeholder) {
            placeholder.remove();
        }

        // Convert and display the HTML
        const outputElement = document.getElementById('output');
        outputElement.innerHTML = convertMarkdown(markdownText);

        // Enable buttons
        document.getElementById('copy-btn').disabled = false;
        document.getElementById('fullscreen-btn').disabled = false;
        document.getElementById('refresh-btn').disabled = false;

        showNotification(`File "${file.name}" loaded successfully.`, 'success');
    };

    reader.onerror = function () {
        showNotification(`Failed to read file "${file.name}".`, 'error');
    };

    reader.readAsText(file);
}

// ============================================
// Clipboard Operations
// ============================================

/**
 * Copy rendered HTML to clipboard
 */
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

/**
 * Load example markdown content
 */
function loadExample() {
    const exampleMarkdown = `$x = {-b \\pm \\sqrt{b^2-4ac} \\over 2a}$

好的,這就來為你鉅細靡遺地「開箱」Strang教授的《Introduction to Linear Algebra》第五版的第五章:**行列式 (Determinants)**!

---

## 線性代數學習筆記 | 第五章:行列式 (Determinants) - 矩陣的「魔法數字」

嘿,各位線性代數的戰友們!我們已經一起闖過了矩陣運算、解線性方程組、向量空間等重要關卡。今天,我們要來探索一個既神秘又充滿力量的概念——**行列式 (Determinant)**。

你可能會問,為什麼需要行列式?前面學的不是已經能解決很多問題了嗎?沒錯,高斯消去法 (Gaussian elimination) 確實是解方程組 \\(A\\boldsymbol{x} = \\boldsymbol{b}\\) 的主力。但是,「行列式」這個從方陣 (square matrix) \\(A\\) 算出來的*單一數字*,卻蘊含了關於這個矩陣驚人的資訊量。

想像一下,你有一個方陣 \\(A\\),你想知道它是不是可逆的 (invertible)?是不是奇異的 (singular)?它的行列式 (我們常寫作 \\(\\det(A)\\) 或 \\(|A|\\),注意!是直桿不是方括號喔!) 就能立刻告訴你答案!如果 \\(\\det(A) = 0\\),那 \\(A\\) 就是奇異矩陣,沒有逆矩陣 (inverse matrix)。反之,如果 \\(\\det(A) \\neq 0\\),那 \\(A\\) 就是可逆的!`;

    // Display the source
    const sourceElement = document.getElementById('source');
    sourceElement.textContent = exampleMarkdown;

    // Remove placeholder if it exists
    const placeholder = document.getElementById('placeholder');
    if (placeholder) {
        placeholder.remove();
    }

    // Convert and display the HTML
    const outputElement = document.getElementById('output');
    outputElement.innerHTML = convertMarkdown(exampleMarkdown);

    // Update file name display
    const fileNameElement = document.querySelector('.file-name');
    fileNameElement.textContent = "example.md";

    // Enable buttons
    document.getElementById('copy-btn').disabled = false;
    document.getElementById('fullscreen-btn').disabled = false;
    document.getElementById('refresh-btn').disabled = false;

    showNotification('Example markdown loaded successfully.', 'success');
}

// ============================================
// Tab Management
// ============================================

/**
 * Switch between source and preview tabs
 * @param {string} tabId - The tab to switch to ('source' or 'preview')
 */
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

/**
 * Initialize theme from localStorage
 */
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
}

/**
 * Set the application theme
 * @param {string} theme - The theme to set ('light' or 'dark')
 */
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    updateThemeToggle(theme);
}

/**
 * Toggle between light and dark theme
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
}

/**
 * Update the theme toggle button appearance
 * @param {string} theme - The current theme
 */
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
// Application Initialization
// ============================================

/**
 * Initialize the application
 */
async function init() {
    try {
        // Initialize theme
        initTheme();
        
        // Load Mathpix Markdown script
        await loadScript();

        // Set up event listeners
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
        document.getElementById('refresh-btn').addEventListener('click', () => {
            const source = document.getElementById('source').textContent;
            const output = document.getElementById('output');
            output.innerHTML = convertMarkdown(source);
            showNotification('Preview refreshed.', 'info');
        });

        document.getElementById('source-tab').addEventListener('click', () => switchTab('source'));
        document.getElementById('preview-tab').addEventListener('click', () => switchTab('preview'));

    } catch (error) {
        console.error('Initialization error:', error);
        showNotification(`Failed to initialize: ${error.message}`, 'error');
    }
}

// ============================================
// Start Application
// ============================================

// Start the application when page loads
document.addEventListener('DOMContentLoaded', init);