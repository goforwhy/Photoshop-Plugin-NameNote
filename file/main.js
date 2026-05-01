/* ===================================================
   记事本插件 — 主逻辑
   Adobe UXP / Photoshop 23+
   =================================================== */

let _ready = false;

function initPanel() {
  if (_ready) return;
  _ready = true;

  const mainInput   = document.getElementById("main-input");
  const btnSeal     = document.getElementById("btn-seal");
  const btnAnalyze  = document.getElementById("btn-analyze");
  const heightInput = document.getElementById("height-input");
  const resultList  = document.getElementById("result-list");

  if (!mainInput || !btnSeal || !btnAnalyze || !resultList) {
    console.error("[记事本] DOM 节点缺失");
    return;
  }

  // ── 高度调节器：偏移量模式（原高度 + 输入值）─────
  // 初始显示 0，表示在当前高度基础上不偏移
  // 基准高度在第一次调整时锁定为当前 offsetHeight
  let baseHeight = null;  // 延迟到第一次使用时获取

  if (heightInput) {
    heightInput.value = 0;
    const heightLabel = document.getElementById("height-label");
    heightInput.addEventListener("focus", () => { heightInput.select(); });

    const applyHeight = () => {
      // 首次应用时记录基准高度
      if (baseHeight === null) {
        baseHeight = mainInput.offsetHeight;
      }
      const offset = parseInt(heightInput.value, 10);
      if (isNaN(offset)) return;
      const newH = baseHeight + offset;
      if (newH >= 30 && newH <= 600) {
        mainInput.style.height = newH + "px";
        if (heightLabel) heightLabel.textContent = (offset >= 0 ? "+" : "") + offset + "px";
      }
    };
    heightInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { applyHeight(); mainInput.focus(); }
    });
    heightInput.addEventListener("blur", applyHeight);
  }

  // ── 封印 / 解封 ─────────────────────────────────
  // 用 readonly + CSS class 代替 disabled，避免浏览器强制把文字改成灰色
  btnSeal.addEventListener("click", () => {
    if (mainInput.readOnly) {
      mainInput.readOnly = false;
      mainInput.classList.remove("sealed");
      btnSeal.textContent = "封印";
    } else {
      mainInput.readOnly = true;
      mainInput.classList.add("sealed");
      btnSeal.textContent = "解封";
    }
  });

  // ── 分析 ───────────────────────────────────────
  btnAnalyze.addEventListener("click", () => {
    const rawText = mainInput.value || "";
    const lines = rawText.split(/\r?\n|\r/);

    resultList.innerHTML = "";
    lines.forEach((lineText) => {
      if (lineText.trim() === "") return;
      resultList.appendChild(createRow(lineText, mainInput));
    });
  });

  console.log("[记事本] 初始化完成");
}

/* ===================================================
   createRow — 创建每行结果卡片
   结构：
     .result-row
       .line-input         （输入框，独占一行）
       .row-btns           （按钮行）
         Name / Name_rules / Name_effect / Shape / Send / del
   =================================================== */
function createRow(lineText, mainInput) {
  const row = document.createElement("div");
  row.className = "result-row";

  // ── 小输入框 ──────────────────────────────────
  const lineInput = document.createElement("input");
  lineInput.type = "text";
  lineInput.className = "line-input";
  lineInput.value = lineText;
  lineInput.spellcheck = false;

  // 记录分析时的原始文案，Name_rules / Name_effect 始终基于它
  const originalText = lineText;

  // ── 按钮容器 ──────────────────────────────────
  const btnRow = document.createElement("div");
  btnRow.className = "row-btns";

  // Name 按钮：将输入框恢复为原始文案并全选（兼顾复制）
  const nameBtn = makeBtn("Name", "name-btn");
  nameBtn.addEventListener("click", () => {
    lineInput.value = originalText;
    doCopyText(originalText, nameBtn, lineInput);
  });

  // Name_rules 按钮：始终 = 原始文案 + "-规范"，复制到剪切板
  const rulesBtn = makeBtn("Name_rules", "action-btn");
  rulesBtn.addEventListener("click", () => {
    const val = originalText + "-规范";
    lineInput.value = val;
    doCopyText(val, rulesBtn, lineInput);
  });

  // Name_effect 按钮：始终 = 原始文案 + "-效果"，复制到剪切板
  const effectBtn = makeBtn("Name_effect", "action-btn");
  effectBtn.addEventListener("click", () => {
    const val = originalText + "-效果";
    lineInput.value = val;
    doCopyText(val, effectBtn, lineInput);
  });

  // Shape 按钮：解析输入框内容中的 宽×高
  const shapeBtn = makeBtn("Shape", "action-btn");
  shapeBtn.addEventListener("click", () => {
    const text = lineInput.value || "";
    // 匹配 数字 + ×/x/X/✕ + 数字
    const match = text.match(/(\d+)\s*[×xX✕]\s*(\d+)/);
    if (!match) {
      shapeBtn.textContent = "无尺寸";
      setTimeout(() => { shapeBtn.textContent = "Shape"; }, 1500);
      return;
    }
    const w = parseInt(match[1], 10);
    const h = parseInt(match[2], 10);
    createRectShape(w, h, shapeBtn);
  });

  // Send 按钮：清空主输入框，再写入本行文案
  const sendBtn = makeBtn("Send", "action-btn");
  sendBtn.addEventListener("click", () => {
    if (mainInput.disabled) {
      sendBtn.textContent = "已封印";
      setTimeout(() => { sendBtn.textContent = "Send"; }, 1500);
      return;
    }
    const text = lineInput.value || "";
    if (!text) return;
    mainInput.value = text;
    sendBtn.textContent = "✓";
    setTimeout(() => { sendBtn.textContent = "Send"; }, 1000);
  });

  // del 按钮
  const delBtn = makeBtn("del", "del-btn");
  delBtn.addEventListener("click", () => { row.remove(); });

  btnRow.appendChild(nameBtn);
  btnRow.appendChild(rulesBtn);
  btnRow.appendChild(effectBtn);
  btnRow.appendChild(shapeBtn);
  btnRow.appendChild(sendBtn);
  btnRow.appendChild(delBtn);

  row.appendChild(lineInput);
  row.appendChild(btnRow);
  return row;
}

/* ── 工具函数 ──────────────────────────────────── */

function makeBtn(label, cls) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = cls;
  btn.textContent = label;
  return btn;
}

function selectAll(input) {
  input.focus();
  if (typeof input.select === "function") input.select();
  if (typeof input.setSelectionRange === "function") {
    input.setSelectionRange(0, input.value.length);
  }
}

/* ===================================================
   createRectShape — 调用 PS batchPlay 新建矩形形状
   全图居中，填充 #ffffff，描边 0px
   =================================================== */
async function createRectShape(w, h, btn) {
  const original = btn.textContent;
  try {
    const ps = require("photoshop");
    const doc = ps.app.activeDocument;
    if (!doc) {
      btn.textContent = "无文档";
      setTimeout(() => { btn.textContent = original; }, 1500);
      return;
    }

    const docW = doc.width;
    const docH = doc.height;
    const left   = Math.round((docW - w) / 2);
    const top    = Math.round((docH - h) / 2);
    const right  = left + w;
    const bottom = top  + h;

    await ps.core.executeAsModal(async () => {
      // 用单个 make 指令直接创建完整矩形形状图层
      await ps.action.batchPlay([
        {
          _obj: "make",
          _target: [{ _ref: "contentLayer" }],
          using: {
            _obj: "contentLayer",
            type: {
              _obj: "solidColorLayer",
              color: { _obj: "RGBColor", red: 255, grain: 255, blue: 255 }
            },
            strokeStyle: {
              _obj: "strokeStyle",
              strokeStyleLineWidth: { _unit: "pixel", _value: 0 },
              strokeStyleLineAlignment: { _enum: "strokeStyleLineAlignment", _value: "strokeStyleAlignInside" },
              strokeStyleContent: {
                _obj: "solidColorLayer",
                color: { _obj: "RGBColor", red: 0, grain: 0, blue: 0 }
              },
              strokeStyleOpacity: { _unit: "percentUnit", _value: 100 },
              strokeStyleEnabled: false
            },
            shape: {
              _obj: "rectangle",
              top:    { _unit: "pixel", _value: top    },
              left:   { _unit: "pixel", _value: left   },
              bottom: { _unit: "pixel", _value: bottom },
              right:  { _unit: "pixel", _value: right  }
            }
          },
          _options: { dialogOptions: "dontDisplay" }
        }
      ], { synchronousExecution: false });
    }, { commandName: "新建矩形形状" });

    btn.textContent = "✓";
    setTimeout(() => { btn.textContent = original; }, 1000);
  } catch (err) {
    console.error("[记事本] Shape 失败:", err.message);
    btn.textContent = "失败";
    setTimeout(() => { btn.textContent = original; }, 1500);
  }
}

/* ===================================================
   doCopyText — 按优先级尝试所有 clipboard 方式
   =================================================== */
async function doCopyText(text, btn, lineInput) {
  const original = btn.textContent;

  // 方式 1：navigator.clipboard
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(text);
      btn.textContent = "✓";
      setTimeout(() => { btn.textContent = original; }, 1000);
      return;
    }
  } catch (err) {
    console.log("[记事本] navigator.clipboard 失败:", err.message);
  }

  // 方式 2：require("uxp").clipboard
  try {
    const uxp = require("uxp");
    const cb = uxp.clipboard || (uxp.storage && uxp.storage.clipboard);
    if (cb && typeof cb.copyText === "function") {
      await cb.copyText(text);
      btn.textContent = "✓";
      setTimeout(() => { btn.textContent = original; }, 1000);
      return;
    }
  } catch (err) {
    console.log("[记事本] require(uxp) 失败:", err.message);
  }

  // 方式 3：execCommand
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;";
    document.body.appendChild(ta);
    ta.focus();
    if (typeof ta.select === "function") ta.select();
    if (typeof ta.setSelectionRange === "function") ta.setSelectionRange(0, ta.value.length);
    if (typeof document.execCommand === "function") {
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      if (ok) {
        btn.textContent = "✓";
        setTimeout(() => { btn.textContent = original; }, 1000);
        return;
      }
    } else {
      document.body.removeChild(ta);
    }
  } catch (err) {
    console.log("[记事本] execCommand 失败:", err.message);
  }

  // ── 降级：全选输入框，提示手动 Ctrl+C ──────────
  if (lineInput) {
    selectAll(lineInput);
    btn.textContent = "选中";
    setTimeout(() => { btn.textContent = original; }, 2000);
    return;
  }

  btn.textContent = "✗";
  setTimeout(() => { btn.textContent = original; }, 1000);
}

initPanel();

// ── 外部链接：用 UXP shell 打开（PS 会弹窗确认）────
(function () {
  let openFn = null;
  try {
    const s = require("uxp").shell;
    if (s && typeof s.openExternal === "function") openFn = (u) => s.openExternal(u);
  } catch (e) {}

  document.body.addEventListener("click", (e) => {
    const el = e.target.closest ? e.target.closest(".ext-link") : null;
    if (!el) return;
    const url = el.getAttribute("data-url");
    if (!url || !openFn) return;
    openFn(url).catch((err) => {
      console.error("[记事本] openExternal 失败:", err && err.message);
    });
  });

  document.querySelectorAll(".ext-link").forEach((el) => {
    el.style.cursor = "pointer";
  });
})();
