(function() {
  'use strict';
  
  // 全局配置
  const CONFIG = {
    uniqueIdPrefix: 'iframe-fullscreen-',
    zIndexBase: 9990,
    animationDuration: 300,
    headerHeight: '50px'
  };
  
  // 生成唯一ID
  function generateUniqueId() {
    return CONFIG.uniqueIdPrefix + Math.random().toString(36).substr(2, 9);
  }
  
  // 防抖函数
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  // CSS样式注入
  function injectStyles() {
    if (document.getElementById('iframe-fullscreen-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'iframe-fullscreen-styles';
    style.textContent = `
      .iframe-container {
        position: relative !important;
        display: block;
        width: 100%;
      }
      
      .iframe-header {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: ${CONFIG.headerHeight};
        background: rgba(30, 30, 30, 0.95);
        color: white;
        padding: 10px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        z-index: ${CONFIG.zIndexBase + 1};
        opacity: 0;
        visibility: hidden;
        transition: opacity ${CONFIG.animationDuration}ms ease, visibility ${CONFIG.animationDuration}ms ease;
        font-family: Arial, sans-serif;
        box-sizing: border-box;
        backdrop-filter: blur(5px);
      }
      
      .iframe-container:hover .iframe-header,
      .iframe-container.theater-mode .iframe-header,
      .iframe-container.fullscreen-mode .iframe-header {
        opacity: 1;
        visibility: visible;
      }
      
      .iframe-title {
        margin: 0;
        font-size: 16px;
        font-weight: bold;
        line-height: 1.4;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        flex: 1;
        margin-right: 20px;
      }
      
      .iframe-controls {
        display: flex;
        gap: 8px;
        flex-shrink: 0;
      }
      
      .iframe-btn {
        cursor: pointer;
        padding: 8px;
        border-radius: 4px;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.3);
      }
      
      .iframe-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: scale(1.1);
        border-color: rgba(255, 255, 255, 0.6);
      }
      
      .iframe-btn-theater:hover {
        background: rgba(255, 193, 7, 0.3);
      }
      
      .iframe-btn-theater:hover svg path {
        fill: #ffc107 !important;
      }
      
      .iframe-btn-fullscreen {
        background: rgba(220, 53, 69, 0.3);
      }
      
      .iframe-btn-fullscreen:hover {
        background: rgba(220, 53, 69, 0.6);
        box-shadow: 0 2px 8px rgba(220, 53, 69, 0.4);
      }
      
      .iframe-btn-fullscreen:hover svg path {
        fill: #fff3cd !important;
      }
      
      .iframe-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(5px);
        z-index: ${CONFIG.zIndexBase - 1};
        opacity: 0;
        visibility: hidden;
        transition: opacity ${CONFIG.animationDuration}ms ease, visibility ${CONFIG.animationDuration}ms ease;
      }
      
      .iframe-overlay.active {
        opacity: 1;
        visibility: visible;
      }
      
      .theater-mode {
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        width: 85vw !important;
        height: 85vh !important;
        max-width: 1200px !important;
        max-height: 800px !important;
        z-index: ${CONFIG.zIndexBase} !important;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8) !important;
        border-radius: 12px !important;
        overflow: hidden !important;
        background: #000 !important;
      }
      
      .theater-mode iframe {
        width: 100% !important;
        height: 100% !important;
        border: none !important;
        border-radius: 12px !important;
      }
      
      .fullscreen-mode {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        z-index: ${CONFIG.zIndexBase + 2} !important;
        background: #000 !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      
      .fullscreen-mode iframe {
        width: 100% !important;
        height: 100% !important;
        border: none !important;
        border-radius: 0 !important;
      }
      
      .body-no-scroll {
        overflow: hidden !important;
      }
      
      @media (max-width: 768px) {
        .theater-mode {
          width: 95vw !important;
          height: 95vh !important;
        }
        
        .iframe-title {
          font-size: 14px;
        }
        
        .iframe-controls {
          gap: 4px;
        }
        
        .iframe-btn {
          padding: 6px;
        }
      }
    `;
    
    document.head.appendChild(style);
  }
  
  // iframe管理器类
  class IFrameManager {
    constructor(iframe) {
      this.iframe = iframe;
      this.uniqueId = generateUniqueId();
      this.currentMode = 'normal';
      this.originalState = null;
      this.container = null;
      this.header = null;
      this.overlay = null;
      
      this.init();
    }
    
    init() {
      this.saveOriginalState();
      this.createContainer();
      this.createHeader();
      this.createOverlay();
      this.bindEvents();
    }
    
    saveOriginalState() {
      const computedStyle = window.getComputedStyle(this.iframe);
      const parentComputedStyle = window.getComputedStyle(this.iframe.parentElement);
      
      this.originalState = {
        iframe: {
          width: this.iframe.style.width || computedStyle.width,
          height: this.iframe.style.height || computedStyle.height,
          position: this.iframe.style.position || computedStyle.position,
          top: this.iframe.style.top || computedStyle.top,
          left: this.iframe.style.left || computedStyle.left,
          zIndex: this.iframe.style.zIndex || computedStyle.zIndex,
          transform: this.iframe.style.transform || computedStyle.transform,
          margin: this.iframe.style.margin || computedStyle.margin,
          padding: this.iframe.style.padding || computedStyle.padding,
          border: this.iframe.style.border || computedStyle.border,
          borderRadius: this.iframe.style.borderRadius || computedStyle.borderRadius
        },
        parent: {
          element: this.iframe.parentElement,
          nextSibling: this.iframe.nextSibling,
          position: this.iframe.parentElement.style.position || parentComputedStyle.position,
          className: this.iframe.parentElement.className
        }
      };
    }
    
    createContainer() {
      // 创建容器包装iframe
      this.container = document.createElement('div');
      this.container.className = 'iframe-container';
      this.container.id = this.uniqueId;
      
      // 将iframe包装到容器中
      const parent = this.iframe.parentElement;
      const nextSibling = this.iframe.nextSibling;
      
      parent.insertBefore(this.container, this.iframe);
      this.container.appendChild(this.iframe);
    }
    
    createHeader() {
      const gameTitle = this.iframe.title || this.iframe.getAttribute('title') || 'Game';
      
      this.header = document.createElement('div');
      this.header.className = 'iframe-header';
      
      const title = document.createElement('div');
      title.className = 'iframe-title';
      title.textContent = gameTitle;
      
      const controls = document.createElement('div');
      controls.className = 'iframe-controls';
      
      // 半屏按钮
      const theaterBtn = this.createButton('theater', `
        <svg width="20" height="20" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <path fill="currentColor" d="M8.5 22.5A3.5 3.5 0 0 0 5 26v48a3.5 3.5 0 0 0 3.5 3.5h83A3.5 3.5 0 0 0 95 74V26a3.5 3.5 0 0 0-3.5-3.5h-83zm3.5 7h76v41H12v-41z"></path>
        </svg>
      `);
      
      // 全屏按钮
      const fullscreenBtn = this.createButton('fullscreen', `
        <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path fill="currentColor" d="M3,15 L3.11662113,15.0067277 C3.57570299,15.0600494 3.93995063,15.424297 3.99327227,15.8833789 L4,16 L4,20 L8,20 L8.11662113,20.0067277 C8.61395981,20.0644928 9,20.4871642 9,21 C9,21.5128358 8.61395981,21.9355072 8.11662113,21.9932723 L8,22 L3,22 L2.88337887,21.9932723 C2.42429701,21.9399506 2.06004937,21.575703 2.00672773,21.1166211 L2,21 L2,16 L2.00672773,15.8833789 C2.06004937,15.424297 2.42429701,15.0600494 2.88337887,15.0067277 L3,15 Z M21,15 C21.5128358,15 21.9355072,15.3860402 21.9932723,15.8833789 L22,16 L22,21 C22,21.5128358 21.6139598,21.9355072 21.1166211,21.9932723 L21,22 L16,22 C15.4477153,22 15,21.5522847 15,21 C15,20.4871642 15.3860402,20.0644928 15.8833789,20.0067277 L16,20 L20,20 L20,16 C20,15.4871642 20.3860402,15.0644928 20.8833789,15.0067277 L21,15 Z M8,2 C8.55228475,2 9,2.44771525 9,3 C9,3.51283584 8.61395981,3.93550716 8.11662113,3.99327227 L8,4 L4,4 L4,8 C4,8.51283584 3.61395981,8.93550716 3.11662113,8.99327227 L3,9 C2.48716416,9 2.06449284,8.61395981 2.00672773,8.11662113 L2,8 L2,3 C2,2.48716416 2.38604019,2.06449284 2.88337887,2.00672773 L3,2 L8,2 Z M21,2 L21.1166211,2.00672773 C21.575703,2.06004937 21.9399506,2.42429701 21.9932723,2.88337887 L22,3 L22,8 L21.9932723,8.11662113 C21.9399506,8.57570299 21.575703,8.93995063 21.1166211,8.99327227 L21,9 L20.8833789,8.99327227 C20.424297,8.93995063 20.0600494,8.57570299 20.0067277,8.11662113 L20,8 L20,4 L16,4 L15.8833789,3.99327227 C15.3860402,3.93550716 15,3.51283584 15,3 C15,2.48716416 15.3860402,2.06449284 15.8833789,2.00672773 L16,2 L21,2 Z"></path>
        </svg>
      `);
      
      controls.appendChild(theaterBtn);
      controls.appendChild(fullscreenBtn);
      
      this.header.appendChild(title);
      this.header.appendChild(controls);
      
      this.container.appendChild(this.header);
    }
    
    createButton(type, iconHtml) {
      const button = document.createElement('button');
      button.className = `iframe-btn iframe-btn-${type}`;
      button.innerHTML = iconHtml;
      button.setAttribute('aria-label', type === 'theater' ? '影院模式' : '全屏模式');
      return button;
    }
    
    createOverlay() {
      this.overlay = document.createElement('div');
      this.overlay.className = 'iframe-overlay';
      this.overlay.id = `${this.uniqueId}-overlay`;
      document.body.appendChild(this.overlay);
    }
    
    bindEvents() {
      const theaterBtn = this.header.querySelector('.iframe-btn-theater');
      const fullscreenBtn = this.header.querySelector('.iframe-btn-fullscreen');
      
      theaterBtn.addEventListener('click', debounce(() => this.toggleTheaterMode(), 300));
      fullscreenBtn.addEventListener('click', debounce(() => this.toggleFullscreenMode(), 300));
      
      // 遮罩点击退出
      this.overlay.addEventListener('click', () => this.exitMode());
      
      // ESC键退出
      this.handleEscKey = (e) => {
        if ((e.key === 'Escape' || e.keyCode === 27) && this.currentMode !== 'normal') {
          this.exitMode();
        }
      };
      
      // 全屏状态变化监听
      this.handleFullscreenChange = () => {
        if (!this.isInFullscreen() && this.currentMode === 'fullscreen') {
          this.exitMode();
        }
      };
      
      const fullscreenEvents = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
      fullscreenEvents.forEach(event => {
        document.addEventListener(event, this.handleFullscreenChange);
      });
    }
    
    toggleTheaterMode() {
      if (this.currentMode === 'theater') {
        this.exitMode();
      } else {
        this.enterTheaterMode();
      }
    }
    
    toggleFullscreenMode() {
      if (this.currentMode === 'fullscreen') {
        this.exitMode();
      } else {
        this.enterFullscreenMode();
      }
    }
    
    enterTheaterMode() {
      this.currentMode = 'theater';
      this.container.classList.add('theater-mode');
      this.overlay.classList.add('active');
      document.body.classList.add('body-no-scroll');
      document.addEventListener('keydown', this.handleEscKey);
    }
    
    enterFullscreenMode() {
      // 尝试浏览器原生全屏
      const requestFullscreen = this.container.requestFullscreen || 
                                this.container.mozRequestFullScreen || 
                                this.container.webkitRequestFullscreen || 
                                this.container.msRequestFullscreen;
      
      if (requestFullscreen) {
        requestFullscreen.call(this.container).then(() => {
          this.currentMode = 'fullscreen';
          this.container.classList.add('fullscreen-mode');
          document.addEventListener('keydown', this.handleEscKey);
        }).catch(() => {
          this.enterSimulatedFullscreen();
        });
      } else {
        this.enterSimulatedFullscreen();
      }
    }
    
    enterSimulatedFullscreen() {
      this.currentMode = 'fullscreen';
      this.container.classList.add('fullscreen-mode');
      this.overlay.classList.add('active');
      document.body.classList.add('body-no-scroll');
      document.addEventListener('keydown', this.handleEscKey);
    }
    
    exitMode() {
      if (this.currentMode === 'normal') return;
      
      // 退出浏览器全屏
      if (this.isInFullscreen()) {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.mozCancelFullScreen) {
          document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen();
        }
      }
      
      // 清理状态
      this.container.classList.remove('theater-mode', 'fullscreen-mode');
      this.overlay.classList.remove('active');
      document.body.classList.remove('body-no-scroll');
      document.removeEventListener('keydown', this.handleEscKey);
      
      this.currentMode = 'normal';
    }
    
    isInFullscreen() {
      return !!(document.fullscreenElement || 
                document.webkitFullscreenElement || 
                document.mozFullScreenElement || 
                document.msFullscreenElement);
    }
    
    destroy() {
      // 退出模式
      this.exitMode();
      
      // 移除事件监听
      const fullscreenEvents = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
      fullscreenEvents.forEach(event => {
        document.removeEventListener(event, this.handleFullscreenChange);
      });
      
      // 恢复DOM结构
      if (this.container && this.originalState) {
        const parent = this.originalState.parent.element;
        const nextSibling = this.originalState.parent.nextSibling;
        
        parent.insertBefore(this.iframe, nextSibling);
        this.container.remove();
      }
      
      // 移除遮罩
      if (this.overlay) {
        this.overlay.remove();
      }
    }
  }
  
  // 主初始化函数
  function initIFrameFullscreen() {
    // 注入样式
    injectStyles();
    
    // 获取所有iframe
    const iframes = document.querySelectorAll('article iframe');
    const managers = [];
    
    iframes.forEach(iframe => {
      try {
        const manager = new IFrameManager(iframe);
        managers.push(manager);
      } catch (error) {
        console.warn('Failed to initialize iframe fullscreen for:', iframe, error);
      }
    });
    
    // 页面卸载时清理
    window.addEventListener('beforeunload', () => {
      managers.forEach(manager => {
        try {
          manager.destroy();
        } catch (error) {
          console.warn('Failed to destroy iframe manager:', error);
        }
      });
    });
    
    return managers;
  }
  
  // DOM加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initIFrameFullscreen);
  } else {
    initIFrameFullscreen();
  }
  
  // 导出到全局（用于调试）
  window.IFrameFullscreen = {
    init: initIFrameFullscreen,
    IFrameManager: IFrameManager
  };
  
})();