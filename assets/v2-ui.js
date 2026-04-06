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
          
          <!-- 操作按钮行 -->
          <div class="blindbox-actions-row">
            <button class="btn-gallery" onclick="BlindBoxModal.close(); PatternCollectionUI.open();">
              纹样图鉴
            </button>
            <button class="btn-collection" onclick="BlindBoxModal.close(); PatternCollectionUI.open();">
              查看绣谱
            </button>
          </div>
          
          <!-- 统计 -->
          <div class="blindbox-stats">
            <span>已收集 ${stats.totalCollected} 个纹样</span>
            <button class="link-btn" onclick="BlindBoxModal.close(); PatternCollectionUI.open();">
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
    
    // === 绣谱系统联动：添加获得的纹样到收藏 ===
    if (result && !result.duplicate) {
      // 根据稀有度映射到对应的皮肤
      const skinMapping = this.getSkinMapping(result.rarity);
      if (skinMapping) {
        V2System.patternCollection.addPattern(skinMapping);
      }
    }
    
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
          showToast(`✨ 得到了${rarityNames[result.rarity]}！新皮肤已解锁`);
        }
      }, 600);
    }
    
    this.isDrawing = false;
    this.hasDrawn = true;
  },
  
  // 根据纹样稀有度映射到对应皮肤
  getSkinMapping(rarity) {
    const mapping = {
      common: ['bg-001', 'frame-001', 'theme-001'],
      rare: ['bg-002', 'frame-002', 'theme-002'],
      epic: ['bg-003', 'frame-003', 'theme-003'],
      legendary: ['bg-004', 'frame-004', 'theme-004']
    };
    // 随机返回该稀有度下的一个未解锁皮肤
    const skins = mapping[rarity] || [];
    const unlocked = V2System.patternCollection.patterns;
    const available = skins.filter(id => !unlocked.includes(id));
    
    if (available.length > 0) {
      return available[Math.floor(Math.random() * available.length)];
    }
    // 如果都有了，返回第一个
    return skins[0];
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
    
    if (result.duplicate) {
      return `
        <div class="result-card rarity-common">
          <div class="result-glow" style="background: #9ca3af"></div>
          <div class="result-svg">♻️</div>
          <div class="result-info">
            <span class="result-rarity" style="background: #9ca3af">重复纹样</span>
            <h3 class="result-name">${result.name}</h3>
            <p class="result-desc">已拥有，转化为 +${result.xpReward} 经验</p>
          </div>
        </div>
      `;
    }
    
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
          <p class="skin-unlock">✨ 新皮肤已解锁！前往绣谱查看</p>
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
          
          <!-- 绣谱入口 -->
          <div class="pattern-collection-entry" onclick="PatternCollectionUI.open()">
            <span>🎨</span>
            <span>我的绣谱</span>
            <span class="count">(${stats.totalCollected})</span>
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

// ========== 绣谱系统 UI（完整版） ==========
const PatternCollectionUI = {
  currentFilter: 'all',
  selectedPattern: null,
  
  open() {
    this.currentFilter = 'all';
    this.selectedPattern = null;
    this.render();
    // 初始化绣谱系统
    V2System.patternCollection.init();
  },
  
  close() {
    const modal = document.getElementById('patternCollectionModal');
    if (modal) {
      modal.style.opacity = '0';
      setTimeout(() => modal.remove(), 300);
    }
  },
  
  render() {
    const unlocked = V2System.patternCollection.getUnlockedPatterns();
    const applied = V2System.patternCollection.getApplied();
    
    const rarityNames = {
      common: '日用',
      rare: '节庆',
      epic: '秘传',
      legendary: '祖灵'
    };
    
    const typeNames = {
      background: '背景',
      avatarFrame: '头像框',
      theme: '主题'
    };
    
    // 移除已存在的弹窗
    const existing = document.getElementById('patternCollectionModal');
    if (existing) existing.remove();
    
    const html = `
      <div id="patternCollectionModal" class="collection-modal" style="opacity: 0; transition: opacity 0.3s;" onclick="PatternCollectionUI.close()">
        <div class="collection-container" onclick="event.stopPropagation()">
          <button class="modal-close" onclick="PatternCollectionUI.close()">×</button>
          
          <div class="collection-header">
            <h2>📚 我的绣谱</h2>
            <p>已收集 ${unlocked.length} 个皮肤 · 点击应用更换外观</p>
          </div>
          
          <div class="collection-filters">
            <button class="filter-btn ${this.currentFilter === 'all' ? 'active' : ''}" onclick="PatternCollectionUI.setFilter('all')">全部</button>
            <button class="filter-btn ${this.currentFilter === 'background' ? 'active' : ''}" onclick="PatternCollectionUI.setFilter('background')">背景</button>
            <button class="filter-btn ${this.currentFilter === 'avatarFrame' ? 'active' : ''}" onclick="PatternCollectionUI.setFilter('avatarFrame')">头像框</button>
            <button class="filter-btn ${this.currentFilter === 'theme' ? 'active' : ''}" onclick="PatternCollectionUI.setFilter('theme')">主题</button>
          </div>
          
          <div class="collection-filters rarity-filters">
            <button class="filter-btn rarity-all ${this.currentFilter === 'rarity-common' ? 'active' : ''}" onclick="PatternCollectionUI.setFilter('rarity-common')">日用</button>
            <button class="filter-btn rarity-rare ${this.currentFilter === 'rarity-rare' ? 'active' : ''}" onclick="PatternCollectionUI.setFilter('rarity-rare')">节庆</button>
            <button class="filter-btn rarity-epic ${this.currentFilter === 'rarity-epic' ? 'active' : ''}" onclick="PatternCollectionUI.setFilter('rarity-epic')">秘传</button>
            <button class="filter-btn rarity-legendary ${this.currentFilter === 'rarity-legendary' ? 'active' : ''}" onclick="PatternCollectionUI.setFilter('rarity-legendary')">祖灵</button>
          </div>
          
          <div class="collection-content">
            <div class="collection-grid" id="collectionGrid">
              ${this.renderGrid(unlocked, rarityNames, typeNames, applied)}
            </div>
            
            ${this.selectedPattern ? this.renderDetailPanel(unlocked, rarityNames, typeNames, applied) : ''}
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', html);
    
    // 触发淡入动画
    requestAnimationFrame(() => {
      const modal = document.getElementById('patternCollectionModal');
      if (modal) modal.style.opacity = '1';
    });
  },
  
  renderGrid(unlocked, rarityNames, typeNames, applied) {
    let filtered = unlocked;
    
    if (this.currentFilter.startsWith('rarity-')) {
      const rarity = this.currentFilter.replace('rarity-', '');
      filtered = unlocked.filter(p => p.rarity === rarity);
    } else if (this.currentFilter !== 'all') {
      filtered = unlocked.filter(p => p.type === this.currentFilter);
    }
    
    if (filtered.length === 0) {
      return '<div class="empty-state">还没有此类皮肤，去"得纹样"获取吧～</div>';
    }
    
    return filtered.map(p => {
      const isApplied = applied[p.type] === p.id;
      return `
        <div class="pattern-item rarity-${p.rarity} ${isApplied ? 'applied' : ''} ${this.selectedPattern === p.id ? 'selected' : ''}" 
             onclick="PatternCollectionUI.selectPattern('${p.id}')">
          <div class="pattern-preview" style="${this.getPreviewStyle(p)}">
            ${p.type === 'background' ? '🖼️' : p.type === 'avatarFrame' ? '👤' : '🎨'}
          </div>
          <div class="pattern-meta">
            <span class="meta-rarity ${p.rarity}">${rarityNames[p.rarity]}</span>
            <span class="meta-type">${typeNames[p.type]}</span>
            <h4>${p.name}</h4>
            ${isApplied ? '<span class="applied-badge">✓ 使用中</span>' : ''}
          </div>
        </div>
      `;
    }).join('');
  },
  
  renderDetailPanel(unlocked, rarityNames, typeNames, applied) {
    const pattern = unlocked.find(p => p.id === this.selectedPattern);
    if (!pattern) return '';
    
    const isApplied = applied[pattern.type] === pattern.id;
    
    return `
      <div class="detail-panel" id="detailPanel">
        <div class="detail-preview" style="${this.getPreviewStyle(pattern, true)}">
          ${pattern.type === 'background' ? '🖼️' : pattern.type === 'avatarFrame' ? '👤' : '🎨'}
        </div>
        <div class="detail-info">
          <span class="detail-rarity ${pattern.rarity}">${rarityNames[pattern.rarity]}</span>
          <h3>${pattern.name}</h3>
          <p class="detail-type">${typeNames[pattern.type]}</p>
          <p class="detail-desc">${pattern.description}</p>
          <div class="detail-actions">
            ${isApplied 
              ? `<button class="btn-secondary" onclick="PatternCollectionUI.unapply('${pattern.type}')">取消应用</button>`
              : `<button class="btn-primary" onclick="PatternCollectionUI.apply('${pattern.id}', '${pattern.type}')">应用此皮肤</button>`
            }
          </div>
        </div>
      </div>
    `;
  },
  
  getPreviewStyle(pattern, isLarge = false) {
    const size = isLarge ? '120px' : '60px';
    switch (pattern.type) {
      case 'background':
        return `background: ${pattern.preview}; width: ${size}; height: ${size}; border-radius: 8px;`;
      case 'avatarFrame':
        return `border: ${pattern.preview}; width: ${size}; height: ${size}; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--bg-secondary);`;
      case 'theme':
        return `background: ${pattern.preview}; width: ${size}; height: ${size}; border-radius: 8px;`;
      default:
        return '';
    }
  },
  
  setFilter(filter) {
    this.currentFilter = filter;
    this.render();
  },
  
  selectPattern(patternId) {
    this.selectedPattern = patternId;
    this.render();
  },
  
  apply(patternId, type) {
    V2System.patternCollection.applyPattern(patternId, type);
    this.render();
    if (window.showToast) showToast('皮肤已应用！');
  },
  
  unapply(type) {
    V2System.patternCollection.unapplyPattern(type);
    this.render();
    if (window.showToast) showToast('已恢复默认');
  }
};

// 兼容旧接口
const PatternCollection = PatternCollectionUI;

// 导出
window.BlindBoxModal = BlindBoxModal;
window.LevelBadge = LevelBadge;
window.LevelModal = LevelModal;
window.CheckinComponent = CheckinComponent;
window.PatternCollectionUI = PatternCollectionUI;
window.PatternCollection = PatternCollection;
