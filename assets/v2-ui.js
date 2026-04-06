/**
 * 瑶绣 v2.0.0 UI 组件
 * 盲盒弹窗、等级展示、签到系统
 */

// ========== 盲盒弹窗组件 ==========
const BlindBoxModal = {
  isOpen: false,
  isDrawing: false,
  
  open() {
    const remaining = V2System.blindBox.getDailyDraws();
    if (remaining <= 0) {
      this.showLimitModal();
      return;
    }
    
    this.isOpen = true;
    this.render();
    this.animateEntrance();
  },
  
  close() {
    this.isOpen = false;
    const modal = document.getElementById('blindBoxModal');
    if (modal) {
      modal.remove();
    }
  },
  
  render() {
    const remaining = V2System.blindBox.getDailyDraws();
    const maxDraws = V2System.blindBox.getMaxDailyDraws();
    
    const html = `
      <div id="blindBoxModal" class="blindbox-modal">
        <div class="blindbox-backdrop" onclick="BlindBoxModal.close()"></div>
        <div class="blindbox-container">
          <button class="blindbox-close" onclick="BlindBoxModal.close()">×</button>
          
          <div class="blindbox-header">
            <h2>得纹样</h2>
            <p class="blindbox-subtitle">每日 ${maxDraws} 次机会，今日剩余 <span class="remaining-count">${remaining}</span> 次</p>
          </div>
          
          <div class="blindbox-stage">
            <div class="mystery-box" id="mysteryBox">
              <div class="box-body">
                <span class="box-icon">🎁</span>
                <div class="box-glow"></div>
              </div>
              <div class="box-lid">
                <span class="lid-icon">✨</span>
              </div>
            </div>
            
            <div class="pattern-result" id="patternResult" style="display: none;">
              <div class="pattern-card" id="resultCard">
                <div class="pattern-svg" id="resultSvg"></div>
                <div class="pattern-info">
                  <span class="rarity-badge" id="rarityBadge"></span>
                  <h3 class="pattern-name" id="patternName"></h3>
                  <p class="pattern-theme" id="patternTheme"></p>
                  <p class="pattern-desc" id="patternDesc"></p>
                  <p class="pattern-quote" id="patternQuote"></p>
                </div>
              </div>
            </div>
          </div>
          
          <div class="blindbox-actions">
            <button class="draw-btn" id="drawBtn" onclick="BlindBoxModal.draw()" ${remaining <= 0 ? 'disabled' : ''}>
              <span class="btn-text">${remaining > 0 ? '拆开' : '今日次数已用完'}</span>
            </button>
            
            <button class="share-btn" id="shareBtn" onclick="BlindBoxModal.share()" style="display: none;">
              <span>分享给好友 +1次</span>
            </button>
          </div>
          
          <div class="blindbox-history">
            <p>已收集 <strong>${V2System.blindBox.getStats().totalCollected}</strong> 个纹样</p>
          </div>
        </div>
      </div>
    `;
    
    // 移除已存在的弹窗
    const existing = document.getElementById('blindBoxModal');
    if (existing) existing.remove();
    
    document.body.insertAdjacentHTML('beforeend', html);
  },
  
  animateEntrance() {
    const box = document.getElementById('mysteryBox');
    if (box) {
      box.style.animation = 'boxFloat 3s ease-in-out infinite';
    }
  },
  
  async draw() {
    if (this.isDrawing) return;
    
    const remaining = V2System.blindBox.getDailyDraws();
    if (remaining <= 0) return;
    
    this.isDrawing = true;
    
    // 动画阶段1：盒子抖动
    const box = document.getElementById('mysteryBox');
    const resultDiv = document.getElementById('patternResult');
    const drawBtn = document.getElementById('drawBtn');
    
    drawBtn.disabled = true;
    box.style.animation = 'boxShake 0.5s ease-in-out';
    
    await this.wait(500);
    
    // 动画阶段2：光芒爆发
    box.style.animation = 'boxOpen 0.8s ease-out forwards';
    
    await this.wait(400);
    
    // 执行抽卡逻辑
    const result = V2System.blindBox.draw();
    
    await this.wait(400);
    
    // 显示结果
    box.style.display = 'none';
    resultDiv.style.display = 'block';
    resultDiv.style.animation = 'cardReveal 0.6s ease-out';
    
    // 填充结果数据
    document.getElementById('resultSvg').innerHTML = result.svg;
    document.getElementById('rarityBadge').textContent = this.getRarityLabel(result.rarity);
    document.getElementById('rarityBadge').className = `rarity-badge rarity-${result.rarity}`;
    document.getElementById('patternName').textContent = result.name;
    document.getElementById('patternTheme').textContent = result.theme;
    document.getElementById('patternDesc').textContent = result.description;
    document.getElementById('patternQuote').textContent = `「${result.quote}」`;
    
    // 更新剩余次数
    const newRemaining = V2System.blindBox.getDailyDraws();
    document.querySelector('.remaining-count').textContent = newRemaining;
    
    // 更新按钮
    if (newRemaining > 0) {
      drawBtn.innerHTML = '<span class="btn-text">再拆一次</span>';
      drawBtn.disabled = false;
    } else {
      drawBtn.innerHTML = '<span class="btn-text">今日次数已用完</span>';
      drawBtn.disabled = true;
      document.getElementById('shareBtn').style.display = 'block';
    }
    
    // 更新等级显示
    LevelBadge.update();
    
    // 稀有纹样触发分享提示
    if (result.rarity !== 'common') {
      this.showRarePrompt(result);
    }
    
    this.isDrawing = false;
  },
  
  getRarityLabel(rarity) {
    const labels = {
      common: '日用纹',
      rare: '节庆纹',
      epic: '秘传纹',
      legendary: '祖灵纹'
    };
    return labels[rarity] || rarity;
  },
  
  showRarePrompt(result) {
    setTimeout(() => {
      const prompts = {
        rare: '得到了节庆纹！分享给你的朋友吧～',
        epic: '得到了秘传纹！太幸运了！',
        legendary: '传说！得到了祖灵纹！这是极少数人才能见到的纹样！'
      };
      
      if (window.showToast) {
        showToast(prompts[result.rarity] || '得到了稀有纹样！');
      }
    }, 1000);
  },
  
  showLimitModal() {
    const html = `
      <div class="limit-modal" onclick="this.remove()">
        <div class="limit-content">
          <p>今日次数已用完</p>
          <p class="limit-hint">分享给好友可额外获得抽卡机会</p>
          <button onclick="BlindBoxModal.share(); document.querySelector('.limit-modal').remove()">立即分享</button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
  },
  
  share() {
    // 分享逻辑
    if (navigator.share) {
      navigator.share({
        title: '小瑶的绣绷',
        text: '我在收集瑶族纹样，来一起发现传统文化的美丽',
        url: window.location.href
      });
    } else {
      // 复制链接
      navigator.clipboard.writeText(window.location.href);
      if (window.showToast) showToast('链接已复制，分享给好友吧～');
    }
    
    // 记录分享
    let shareCount = parseInt(localStorage.getItem('yao-share-count') || '0');
    localStorage.setItem('yao-share-count', (shareCount + 1).toString());
  },
  
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

// ========== 等级徽章组件 ==========
const LevelBadge = {
  init() {
    this.render();
    this.update();
  },
  
  render() {
    const existing = document.getElementById('levelBadge');
    if (existing) existing.remove();
    
    const html = `
      <div id="levelBadge" class="level-badge-container" onclick="LevelModal.open()">
        <div class="level-icon" id="levelIcon">🌱</div>
        <div class="level-info">
          <span class="level-title" id="levelTitle">好奇学徒</span>
          <div class="level-progress-bar">
            <div class="level-progress-fill" id="levelProgressFill" style="width: 0%"></div>
          </div>
        </div>
      </div>
    `;
    
    // 插入到 header
    const header = document.querySelector('header');
    if (header) {
      const container = header.querySelector('.flex.items-center.gap-1');
      if (container) {
        container.insertAdjacentHTML('beforeend', html);
      }
    }
  },
  
  update() {
    const levelInfo = V2System.level.getLevelInfo();
    const progress = V2System.level.getProgress();
    
    const iconEl = document.getElementById('levelIcon');
    const titleEl = document.getElementById('levelTitle');
    const fillEl = document.getElementById('levelProgressFill');
    
    if (iconEl) iconEl.textContent = levelInfo.current.icon;
    if (titleEl) titleEl.textContent = levelInfo.current.title;
    if (fillEl) fillEl.style.width = `${progress}%`;
  }
};

// ========== 等级详情弹窗 ==========
const LevelModal = {
  open() {
    const levelInfo = V2System.level.getLevelInfo();
    const stats = V2System.blindBox.getStats();
    
    const html = `
      <div id="levelModal" class="level-modal">
        <div class="level-backdrop" onclick="LevelModal.close()"></div>
        <div class="level-container">
          <button class="level-close" onclick="LevelModal.close()">×</button>
          
          <div class="level-header">
            <div class="level-big-icon">${levelInfo.current.icon}</div>
            <h2>${levelInfo.current.title}</h2>
            <p>等级 ${levelInfo.current.level}</p>
          </div>
          
          <div class="level-progress-section">
            <div class="progress-label">
              <span>升级进度</span>
              <span>${levelInfo.progress}%</span>
            </div>
            <div class="progress-bar-large">
              <div class="progress-fill-large" style="width: ${levelInfo.progress}%"></div>
            </div>
            ${levelInfo.next ? `<p class="next-level-hint">距离「${levelInfo.next.title}」还差一步</p>` : ''}
          </div>
          
          <div class="level-stats">
            <div class="stat-item">
              <span class="stat-value">${stats.totalCollected}</span>
              <span class="stat-label">收集纹样</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">${stats.legendaryCount}</span>
              <span class="stat-label">祖灵纹</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">${V2System.checkin.getStreak()}</span>
              <span class="stat-label">连续签到</span>
            </div>
          </div>
          
          <div class="level-rewards">
            <h3>当前特权</h3>
            <ul>
              ${levelInfo.current.rewards.map(r => `<li>✓ ${r}</li>`).join('')}
            </ul>
            ${levelInfo.next ? `
              <h3>下一级奖励</h3>
              <ul class="next-rewards">
                ${levelInfo.next.rewards.map(r => `<li>○ ${r}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        </div>
      </div>
    `;
    
    const existing = document.getElementById('levelModal');
    if (existing) existing.remove();
    
    document.body.insertAdjacentHTML('beforeend', html);
  },
  
  close() {
    const modal = document.getElementById('levelModal');
    if (modal) modal.remove();
  }
};

// ========== 签到组件 ==========
const CheckinComponent = {
  init() {
    this.render();
    this.checkToday();
  },
  
  render() {
    const existing = document.getElementById('checkinComponent');
    if (existing) existing.remove();
    
    const streak = V2System.checkin.getStreak();
    const isChecked = V2System.checkin.isCheckedToday();
    
    const html = `
      <div id="checkinComponent" class="checkin-banner ${isChecked ? 'checked' : ''}">
        <div class="checkin-content">
          <span class="checkin-icon">📅</span>
          <span class="checkin-text">
            ${isChecked 
              ? `已连续签到 ${streak} 天，明天继续～` 
              : `今日未签到，签到获得抽卡机会`
            }
          </span>
          ${!isChecked ? `<button class="checkin-btn-small" onclick="CheckinComponent.doCheckin()">签到</button>` : ''}
        </div>
      </div>
    `;
    
    // 插入到 chatContainer 前面
    const chatContainer = document.getElementById('chatContainer');
    if (chatContainer) {
      chatContainer.insertAdjacentHTML('beforebegin', html);
    }
  },
  
  doCheckin() {
    const result = V2System.checkin.checkin();
    if (result.success) {
      this.render();
      LevelBadge.update();
      
      // 显示奖励
      const rewards = result.rewards.map(r => r.desc).join('、');
      if (window.showToast) {
        showToast(`签到成功！${rewards}`);
      }
      
      // 连续7天特殊提示
      if (result.streak === 7) {
        setTimeout(() => {
          if (window.showToast) showToast('🎉 连续7天签到成就达成！');
        }, 1500);
      }
    }
  },
  
  checkToday() {
    // 每天首次打开时检查
    const today = new Date().toDateString();
    const lastCheck = localStorage.getItem('yao-last-app-open');
    if (lastCheck !== today) {
      localStorage.setItem('yao-last-app-open', today);
      // 可以在这里显示每日问候
    }
  }
};

// ========== 纹样收藏册组件 ==========
const PatternCollection = {
  open() {
    const patterns = V2System.blindBox.getUnlockedPatternDetails();
    const stats = V2System.blindBox.getStats();
    
    const html = `
      <div id="patternCollection" class="collection-modal">
        <div class="collection-backdrop" onclick="PatternCollection.close()"></div>
        <div class="collection-container">
          <button class="collection-close" onclick="PatternCollection.close()">×</button>
          
          <div class="collection-header">
            <h2>我的绣谱</h2>
            <p>已收集 ${stats.totalCollected} 个纹样</p>
          </div>
          
          <div class="collection-filters">
            <button class="filter-btn active" onclick="PatternCollection.filter('all')">全部</button>
            <button class="filter-btn" onclick="PatternCollection.filter('common')">日用</button>
            <button class="filter-btn" onclick="PatternCollection.filter('rare')">节庆</button>
            <button class="filter-btn" onclick="PatternCollection.filter('epic')">秘传</button>
            <button class="filter-btn" onclick="PatternCollection.filter('legendary')">祖灵</button>
          </div>
          
          <div class="collection-grid" id="collectionGrid">
            ${patterns.map(p => this.createPatternCard(p)).join('')}
            ${patterns.length === 0 ? '<p class="empty-hint">还没有收集到纹样，去"得纹样"看看吧～</p>' : ''}
          </div>
        </div>
      </div>
    `;
    
    const existing = document.getElementById('patternCollection');
    if (existing) existing.remove();
    
    document.body.insertAdjacentHTML('beforeend', html);
  },
  
  close() {
    const modal = document.getElementById('patternCollection');
    if (modal) modal.remove();
  },
  
  createPatternCard(pattern) {
    return `
      <div class="collection-card rarity-${pattern.rarity}" data-rarity="${pattern.rarity}">
        <div class="card-svg">${pattern.svg}</div>
        <div class="card-info">
          <span class="card-rarity">${BlindBoxModal.getRarityLabel(pattern.rarity)}</span>
          <h4>${pattern.name}</h4>
          <p class="card-theme">${pattern.theme}</p>
          <p class="card-quote">「${pattern.quote}」</p>
        </div>
      </div>
    `;
  },
  
  filter(rarity) {
    const cards = document.querySelectorAll('.collection-card');
    const buttons = document.querySelectorAll('.filter-btn');
    
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    cards.forEach(card => {
      if (rarity === 'all' || card.dataset.rarity === rarity) {
        card.style.display = 'block';
      } else {
        card.style.display = 'none';
      }
    });
  }
};

// 导出
window.BlindBoxModal = BlindBoxModal;
window.LevelBadge = LevelBadge;
window.LevelModal = LevelModal;
window.CheckinComponent = CheckinComponent;
window.PatternCollection = PatternCollection;
