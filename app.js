// ===================== 1. 初始化数据（仅读取单独JSON文件） =====================
let navData = [];

// 从单独的JSON文件读取初始数据
async function loadInitialData() {
  try {
    // 优先读本地存储（用户修改后的数据），没有再读JSON文件
    const localData = localStorage.getItem('navData');
    if (localData) {
      navData = JSON.parse(localData);
    } else {
      // 读取单独的nav-data.json文件（唯一初始数据源）
      const response = await fetch('nav-data.json');
      navData = await response.json();
    }
    renderCategories();
  } catch (err) {
    alert('读取初始数据失败！请确保nav-data.json文件存在');
    console.error(err);
  }
}

// ===================== 2. 渲染页面 =====================
function renderCategories() {
  const container = document.getElementById('category-container');
  container.innerHTML = '';

  navData.forEach((category, catIndex) => {
    // 分类标题
    const categoryTitle = document.createElement('div');
    categoryTitle.className = 'category-title';
    categoryTitle.innerHTML = `
      <i class="fa ${category.icon} ${category.color}"></i>
      <h2>${category.category}</h2>
    `;
    container.appendChild(categoryTitle);

    // 卡片容器（改class）
    const cardContainer = document.createElement('div');
    cardContainer.className = 'card-container';
    cardContainer.dataset.category = category.category;
    cardContainer.dataset.catIndex = catIndex;
    container.appendChild(cardContainer);

    // 网站卡片（核心改结构+class，解决空白/图标问题）
    category.websites.forEach(website => {
      const card = document.createElement('a');
      card.href = website.url;
      card.target = '_blank';
      card.className = 'card-hover';
      card.dataset.id = website.id;
      card.innerHTML = `
        <button class="edit-btn" onclick="event.preventDefault();openEditModal('${website.id}')">
          <i class="fa fa-pencil text-xs"></i>
        </button>
        <img src="${website.icon}" alt="${website.name}">
        <div class="name">${website.name}</div>
        <div class="desc">${website.desc}</div>
      `;
      cardContainer.appendChild(card);
    });

    // 拖拽排序（逻辑不变）
    new Sortable(cardContainer, {
      animation: 150,
      onEnd: (evt) => {
        const movedItem = category.websites.splice(evt.oldIndex, 1)[0];
        category.websites.splice(evt.newIndex, 0, movedItem);
        saveData();
      }
    });
  });
}

// ===================== 3. 数据操作函数 =====================
// 根据ID查找网站（修复逻辑，返回正确格式）
function findWebsiteById(id) {
  for (const category of navData) {
    const website = category.websites.find(item => item.id === id);
    if (website) {
      return {
        website: website,
        category: category.category,
        catIndex: navData.findIndex(c => c.category === category.category)
      };
    }
  }
  return null;
}

// 生成唯一ID
function generateId() {
  return Date.now().toString(16);
}

// 保存数据到本地存储
function saveData() {
  localStorage.setItem('navData', JSON.stringify(navData));
}

// ===================== 4. 弹窗相关（核心修复：编辑/删除功能） =====================
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const siteForm = document.getElementById('site-form');
const deleteBtn = document.getElementById('delete-site');
const siteIdInput = document.getElementById('site-id');
const siteNameInput = document.getElementById('site-name');
const siteDescInput = document.getElementById('site-desc');
const siteUrlInput = document.getElementById('site-url');
const siteIconInput = document.getElementById('site-icon');
const siteCategoryInput = document.getElementById('site-category');

// 全局暴露编辑弹窗函数（修复卡片点击调用）
window.openEditModal = function(siteId) {
  const siteInfo = findWebsiteById(siteId);
  if (!siteInfo) return;

  // 填充编辑数据
  modalTitle.textContent = '编辑网址';
  siteIdInput.value = siteInfo.website.id;
  siteNameInput.value = siteInfo.website.name;
  siteDescInput.value = siteInfo.website.desc;
  siteUrlInput.value = siteInfo.website.url;
  siteIconInput.value = siteInfo.website.icon;
  siteCategoryInput.value = siteInfo.category;

  // 显示弹窗和删除按钮
  modal.style.display = 'flex';
  deleteBtn.style.display = 'inline-block';

  // 绑定删除按钮事件（修复删除逻辑）
  deleteBtn.onclick = () => {
    if (confirm('确定要删除这个网址吗？')) {
      // 从对应分类中删除网站
      const catIndex = siteInfo.catIndex;
      navData[catIndex].websites = navData[catIndex].websites.filter(item => item.id !== siteId);
      saveData();
      renderCategories();
      modal.style.display = 'none';
    }
  };
};

// 打开添加弹窗
document.getElementById('add-btn').addEventListener('click', () => {
  modalTitle.textContent = '添加网址';
  siteForm.reset();
  siteIdInput.value = '';
  deleteBtn.style.display = 'inline-block'; // 统一显示删除按钮（添加时点击删除则清空表单）
  modal.style.display = 'flex';

  // 添加时删除按钮逻辑：清空表单
  deleteBtn.onclick = () => {
    siteForm.reset();
    siteIdInput.value = '';
  };
});

// 关闭弹窗
document.getElementById('close-modal').addEventListener('click', () => {
  modal.style.display = 'none';
});
document.getElementById('cancel-btn').addEventListener('click', () => {
  modal.style.display = 'none';
});

// 提交表单（添加/编辑，修复逻辑）
siteForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const id = siteIdInput.value;
  const name = siteNameInput.value.trim();
  const desc = siteDescInput.value.trim();
  const url = siteUrlInput.value.trim();
  // 替换成稳定的国内图标接口
  const icon = siteIconInput.value.trim() || `https://api.iowen.cn/favicon/${new URL(url).hostname}`;
  const categoryName = siteCategoryInput.value;

  if (id) {
    // 编辑现有网站
    const siteInfo = findWebsiteById(id);
    if (siteInfo) {
      // 如果分类变了，先删后加
      if (siteInfo.category !== categoryName) {
        // 从旧分类删除
        navData[siteInfo.catIndex].websites = navData[siteInfo.catIndex].websites.filter(item => item.id !== id);
        // 找到新分类并添加
        const newCatIndex = navData.findIndex(c => c.category === categoryName);
        navData[newCatIndex].websites.push({
          id, name, desc, url, icon
        });
      } else {
        // 分类不变，直接更新
        const website = siteInfo.website;
        website.name = name;
        website.desc = desc;
        website.url = url;
        website.icon = icon;
      }
    }
  } else {
    // 添加新网站
    const newId = generateId();
    const newCatIndex = navData.findIndex(c => c.category === categoryName);
    navData[newCatIndex].websites.push({
      id: newId,
      name,
      desc,
      url,
      icon
    });
  }

  saveData();
  renderCategories();
  modal.style.display = 'none';
});

// ===================== 5. 导入导出功能 =====================
// 导出JSON（覆盖原始nav-data.json）
document.getElementById('export-btn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(navData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'nav-data.json';
  a.click();
  URL.revokeObjectURL(url);
});

// 导入JSON
document.getElementById('import-btn').addEventListener('click', () => {
  document.getElementById('import-file').click();
});

document.getElementById('import-file').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const importedData = JSON.parse(evt.target.result);
      navData = importedData;
      saveData();
      renderCategories();
      alert('导入成功！');
    } catch (err) {
      alert('导入失败：文件格式错误！');
      console.error(err);
    }
    e.target.value = '';
  };
  reader.readAsText(file);
});

// ===================== 6. 初始化 =====================
window.onload = loadInitialData;