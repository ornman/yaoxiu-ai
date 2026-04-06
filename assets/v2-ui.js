/**
 * 瑶绣 v2.0.0 UI 组件 - 修复版
 * 简化交互，修复盲盒bug
 */

// ========== 盲盒弹窗组件（修复版） ==========
const BlindBoxModal = {
  isDrawing: false,
  hasDrawn: false, // 标记本次弹窗是否已抽过
  
  open() {
    const remaining = V2System.blindBox.getDailyDraws();
    
    // 重置状态
    this.isDrawing = false;
    this.hasDrawn = false;
    
    if (remaining <= 0) {
      this.showLimitModal();
      return;
    }
    
    this.render();
  },
  
  close() {
    const modal = document.getElementById('blindBoxModal');
    if (modal) {
      modal.style.opacity = '0';
      setTimeout(() => modal.remove(), 300);
    }
    this.isDrawing = false;
    this.hasDrawn = false;
  },
  
  render() {
    const remaining = V2System.blindBox.getDailyDraws();
    const maxDraws = V2System.blindBox.getMaxDailyDraws();
    const stats = V2System.blindBox.getStats();
    
    // 移除已存在的弹窗
    const existing = document.getElementById('blindBoxModal');
    if (existing) existing.remove();
    
    const html = `
      <div id="blindBoxModal" class="blindbox-modal" style="opacity: 0; transition: opacity 0.3s;">
        <div class="blindbox-backdrop" onclick="BlindBoxModal.close()"></div>
        <div class="blindbox-container">
          <button class="blindbox-close" onclick="BlindBoxModal.close()">×</button>
          
          <div class="blindbox-header">
            <h2>🎁 得纹样</h2>
            <p class="blindbox-subtitle">今日 ${remaining}/${maxDraws} 次机会</p>
          </div>
          
          <!-- 抽卡前状态 -->
          <div id="drawStage" class="draw-stage">
            <div class="mystery-box" onclick="BlindBoxModal.draw()">
              <div class="box-glow"></div>
              <span class="box-icon">🎁</span>
              <p class="box-hint">点击拆开</p>
            </div>
          </div>
          
          <!-- 抽卡后状态（隐藏） -->
          <div id="resultStage" class="result-stage" style="display: none;">
            <div class="pattern-showcase" id="patternShowcase"></div>
          </div>
          
          <!-- 操作按钮 -->
          <div class="blindbox-actions">
            <button id="primaryBtn" class="btn-primary" onclick="BlindBoxModal.handlePrimary()">
              拆开
            </button>
            <button class="btn-secondary" onclick="BlindBoxModal.close()">
              稍后再说
            </button>
          </div>
          
          <!-- 统计 -->
          <div class="blindbox-stats">
            <span>已收集 ${stats.totalCollected} 个纹样</span>
            <button class="link-btn" onclick="BlindBoxModal.close(); PatternCollection.open();">
              查看绣谱 →
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', html);
    
    // 触发淡入动画
    requestAnimationFrame(() => {
      const modal = document.getElementById('blindBoxModal');
      if (modal) modal.style.opacity = '1';
    });
  },
  
  // 处理主按钮点击
  handlePrimary() {
    if (this.hasDrawn) {
      // 已经抽过了，关闭弹窗
      this.close();
    } else {
      // 还没抽，执行抽卡
      this.draw();
    }
  },
  
  async draw() {
    if (this.isDrawing || this.hasDrawn) return;
    
    const remaining = V2System.blindBox.getDailyDraws();
    if (remaining <= 0) {
      this.showLimitModal();
      return;
    }
    
    this.isDrawing = true;
    
    const drawStage = document.getElementById('drawStage');
    const resultStage = document.getElementById('resultStage');
    const primaryBtn = document.getElementById('primaryBtn');
    
    // 禁用按钮
    if (primaryBtn) {
      primaryBtn.disabled = true;
      primaryBtn.textContent = '开启中...';
    }
    
    // 盒子动画
    const box = drawStage.querySelector('.mystery-box');
    if (box) {
      box.style.animation = 'boxShake 0.5s ease-in-out, boxGlow 0.5s ease-in-out';
    }
    
    await this.wait(500);
    
    // 执行抽卡
    const result = V2System.blindBox.draw();
    
    // 隐藏抽卡区，显示结果
    if (drawStage) drawStage.style.display = 'none';
    if (resultStage) {
      resultStage.style.display = 'block';
      resultStage.innerHTML = this.createResultHTML(result);
      resultStage.style.animation = 'fadeInUp 0.5s ease-out';
    }
    
    // 更新按钮
    const newRemaining = V2System.blindBox.getDailyDraws();
    if (primaryBtn) {
      primaryBtn.disabled = false;
      primaryBtn.textContent = newRemaining > 0 ? '再拆一个' : '知道了';
    }
    
    // 更新header次数
    const subtitle = document.querySelector('.blindbox-subtitle');
    if (subtitle) {
      subtitle.textContent = `今日 ${newRemaining}/${V2System.blindBox.getMaxDailyDraws()} 次机会`;
    }
    
    // 更新统计
    const statsEl = document.querySelector('.blindbox-stats span');
    if (statsEl) {
      const stats = V2System.blindBox.getStats();
      statsEl.textContent = `已收集 ${stats.totalCollected} 个纹样`;
    }
    
    // 更新等级
    if (window.LevelBadge) LevelBadge.update();
    
    // 更新盲盒入口按钮的数字
    this.updateEntryButton();
    
    // 稀有纹样提示
    if (result.rarity !== 'common') {
      setTimeout(() => {
        const rarityNames = { rare: '节庆纹', epic: '秘传纹', legendary: '祖灵纹' };
        if (window.showToast) {
          showToast(`✨ 得到了${rarityNames[result.rarity]}！`);
        }
      }, 600);
    }
    
    this.isDrawing = false;
    this.hasDrawn = true;
  },
  
  createResultHTML(result) {
    const rarityColors = {
      common: '#9ca3af',
      rare: '#3b82f6',
      epic: '#a855f7',
      legendary: '#f59e0b'
    };
    
    const rarityNames = {
      common: '日用纹',
      rare: '节庆纹',
      epic: '秘传纹',
      legendary: '祖灵纹'
    };
    
    return `
      <div class="result-card rarity-${result.rarity}">
        <div class="result-glow" style="background: ${rarityColors[result.rarity]}"></div>
        <div class="result-svg">${result.svg}</div>
        <div class="result-info">
          <span class="result-rarity" style="background: ${rarityColors[result.rarity]}">
            ${rarityNames[result.rarity]}
          </span>
          <h3 class="result-name">${result.name}</h3>
          <p class="result-theme">${result.theme}</p>
          <p class="result-desc">${result.description}</p>
          <blockquote class="result-quote">「${result.quote}」</blockquote>
        </div>
      </div>
    `;
  },
  
  updateEntryButton() {
    const entryBtn = document.getElementById('blindBoxEntry');
    if (entryBtn) {
      const remaining = V2System.blindBox.getDailyDraws();
      const countEl = entryBtn.querySelector('.blindbox-count');
      if (countEl) countEl.textContent = remaining;
    }
  },
  
  showLimitModal() {
    const html = `
      <div id="limitModal" class="limit-modal" onclick="this.remove()">
        <div class="limit-content" onclick="event.stopPropagation()">
          <div class="limit-icon">📅</div>
          <h3>今日次数已用完</h3>
          <p>明天再来，或者分享给好友获得额外机会</p>
          <div class="limit-actions">
            <button class="btn-primary" onclick="BlindBoxModal.share(); document.getElementById('limitModal').remove()">
              分享给好友
            </button>
            <button class="btn-secondary" onclick="document.getElementById('limitModal').remove()">
              我知道了
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
  },
  
  share() {
    if (navigator.share) {
      navigator.share({
        title: '小瑶的绣绷',
        text: '我在收集瑶族纹样，每一个背后都有动人的故事',
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      if (window.showToast) showToast('链接已复制');
    }
    
    let shareCount = parseInt(localStorage.getItem('yao-share-count') || '0');
    localStorage.setItem('yao-share-count', (shareCount + 1).toString());
  },
  
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

// ========== 简化的等级徽章 ==========
const LevelBadge = {
  init() {
    this.render();
  },
  
  render() {
    // 插入到header的合适位置
    const header = document.querySelector('header .flex.items-center.justify-between');
    if (!header) return;
    
    const rightSection = header.querySelector('.flex.items-center.gap-1, .flex.items-center.gap-3');
    if (!rightSection) return;
    
    // 检查是否已存在
    if (document.getElementById('levelBadge')) return;
    
    const levelInfo = V2System.level.getLevelInfo();
    
    const html = `
      <div id="levelBadge" class="level-badge" onclick="LevelModal.open()">
        <span class="level-icon">${levelInfo.current.icon}</span>
        <div class="level-text">
          <span class="level-title">${levelInfo.current.title}</span>
          <div class="level-bar">
            <div class="level-fill" style="width: ${V2System.level.getProgress()}%"></div>
          </div>
        </div>
      </div>
    `;
    
    // 插入到最前面
    rightSection.insertAdjacentHTML('afterbegin', html);
  },
  
  update() {
    const badge = document.getElementById('levelBadge');
    if (!badge) return;
    
    const levelInfo = V2System.level.getLevelInfo();
    badge.querySelector('.level-icon').textContent = levelInfo.current.icon;
    badge.querySelector('.level-title').textContent = levelInfo.current.title;
    badge.querySelector('.level-fill').style.width = `${V2System.level.getProgress()}%`;
  }
};

// ========== 简化的等级弹窗 ==========
const LevelModal = {
  open() {
    const levelInfo = V2System.level.getLevelInfo();
    const stats = V2System.blindBox.getStats();
    
    const html = `
      <div id="levelModal" class="level-modal" onclick="LevelModal.close()">
        <div class="level-container" onclick="event.stopPropagation()">
          <button class="modal-close" onclick="LevelModal.close()">×</button>
          
          <div class="level-header">
            <div class="level-big-icon">${levelInfo.current.icon}</div>
            <h2>${levelInfo.current.title}</h2>
            <p>等级 ${levelInfo.current.level}</p>
          </div>
          
          <div class="level-progress">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${V2System.level.getProgress()}%"></div>
            </div>
            <span>${V2System.level.getProgress()}%</span>
          </div>
          
          <div class="stats-grid">
            <div class="stat-item">
              <strong>${stats.totalCollected}</strong>
              <span>纹样</span>
            </div>
            <div class="stat-item">
              <strong>${stats.legendaryCount}</strong>
              <span>祖灵</span>
            </div>
            <div class="stat-item">
              <strong>${V2System.checkin.getStreak()}</strong>
              <span>连续</span>
            </div>
          </div>
          
          ${levelInfo.next ? `
            <div class="next-level">
              <p>距离「${levelInfo.next.title}」还需：</p>
              <ul>
                ${levelInfo.next.rewards.map(r => `<li>○ ${r}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', html);
  },
  
  close() {
    const modal = document.getElementById('levelModal');
    if (modal) modal.remove();
  }
};

// ========== 简化的签到组件 ==========
const CheckinComponent = {
  init() {
    this.render();
  },
  
  render() {
    // 插入到header下方
    const header = document.querySelector('header');
    if (!header) return;
    
    // 检查是否已存在
    if (document.getElementById('checkinBar')) return;
    
    const isChecked = V2System.checkin.isCheckedToday();
    const streak = V2System.checkin.getStreak();
    
    const html = `
      <div id="checkinBar" class="checkin-bar ${isChecked ? 'checked' : ''}">
        <div class="checkin-content">
          <span class="checkin-icon">📅</span>
          <span class="checkin-text">
            ${isChecked 
              ? `已签到，连续${streak}天` 
              : `今日未签到，签到获得抽卡机会`
            }
          </span>
          ${!isChecked ? `<button onclick="CheckinComponent.checkin()">签到</button>` : ''}
        </div>
      </div>
    `;
    
    header.insertAdjacentHTML('afterend', html);
  },
  
  checkin() {
    const result = V2System.checkin.checkin();
    if (result.success) {
      this.render();
      if (window.LevelBadge) LevelBadge.update();
      
      const rewards = result.rewards.map(r => r.desc).join('、');
      if (window.showToast) showToast(`签到成功！${rewards}`);
      
      // 更新盲盒入口数字
      BlindBoxModal.updateEntryButton();
    }
  }
};

// ========== 简化的收藏册 ==========
const PatternCollection = {
  open() {
    const patterns = V2System.blindBox.getUnlockedPatternDetails();
    const stats = V2System.blindBox.getStats();
    
    const rarityNames = {
      common: '日用',
      rare: '节庆',
      epic: '秘传',
      legendary: '祖灵'
    };
    
    const html = `
      <div id="patternCollection" class="collection-modal" onclick="PatternCollection.close()">
        <div class="collection-container" onclick="event.stopPropagation()">
          <button class="modal-close" onclick="PatternCollection.close()">×</button>
          
          <div class="collection-header">
            <h2>📚 我的绣谱</h2>
            <p>已收集 ${stats.totalCollected} 个纹样</p>
          </div>
          
          <div class="collection-filters">
            <button class="filter-btn active" onclick="PatternCollection.filter('all', this)">全部</button>
            <button class="filter-btn" onclick="PatternCollection.filter('common', this)">日用</button>
            <button class="filter-btn" onclick="PatternCollection.filter('rare', this)">节庆</button>
            <button class="filter-btn" onclick="PatternCollection.filter('epic', this)">秘传</button>
            <button class="filter-btn" onclick="PatternCollection.filter('legendary', this)">祖灵</button>
          </div>
          
          <div class="collection-grid">
            ${patterns.length === 0 
              ? '<div class="empty-state">还没有收集到纹样，去"得纹样"看看吧～</div>'
              : patterns.map(p => `
                <div class="pattern-item rarity-${p.rarity}" data-rarity="${p.rarity}">
                  <div class="pattern-preview">${p.svg}</div>
                  <div class="pattern-meta">
                    <span class="meta-rarity">${rarityNames[p.rarity]}</span>
                    <h4>${p.name}</h4>
                    <p>${p.theme}</p>
                  </div>
                </div>
              `).join('')
            }
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', html);
  },
  
  close() {
    const modal = document.getElementById('patternCollection');
    if (modal) modal.remove();
  },
  
  filter(rarity, btn) {
    // 更新按钮状态
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // 过滤显示
    document.querySelectorAll('.pattern-item').forEach(item => {
      item.style.display = (rarity === 'all' || item.dataset.rarity === rarity) ? 'block' : 'none';
    });
  }
};

// 导出
window.BlindBoxModal = BlindBoxModal;
window.LevelBadge = LevelBadge;
window.LevelModal = LevelModal;
window.CheckinComponent = CheckinComponent;
window.PatternCollection = PatternCollection;
