/* Strategy Intake — interactive behavior
   Autosave to localStorage, export markdown, print, reset.
*/
(function () {
  const STORAGE_KEY = "dk-intake-v1";
  const FORM_SELECTOR = "[data-intake]";

  // Where submissions go. Two channels, both optional, both fire in parallel.
  // 1) Web3Forms — emails the markdown export to the address you registered at web3forms.com
  // 2) Google Apps Script — appends a row to a Google Sheet you own.
  const WEB3FORMS_ACCESS_KEY = "36b08080-3896-4637-af34-64710234fb75";
  const SHEETS_WEBHOOK_URL   = "https://script.google.com/macros/s/AKfycbzf5qbYLLoxBdQnED6NlIOSpwG94QkbrKOxVsW6_9346sxlHDA2CDyhC4TgTR9CbeAr1g/exec";

  function $all(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

  function collect() {
    const form = document.querySelector(FORM_SELECTOR);
    if (!form) return {};
    const data = {};
    $all("textarea, input[type=text]", form).forEach(el => {
      if (el.name) data[el.name] = el.value;
    });
    $all("input[type=range]", form).forEach(el => {
      if (el.name) data[el.name] = el.value;
    });
    $all("input[type=radio]:checked", form).forEach(el => {
      data[el.name] = el.value;
    });
    $all("input[type=checkbox]", form).forEach(el => {
      data[el.name] = el.checked;
    });
    return data;
  }

  function restore() {
    let raw;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { return; }
    if (!raw) return;
    let data; try { data = JSON.parse(raw); } catch (e) { return; }
    const form = document.querySelector(FORM_SELECTOR);
    if (!form) return;
    $all("textarea, input[type=text]", form).forEach(el => {
      if (el.name && data[el.name] != null) el.value = data[el.name];
    });
    $all("input[type=range]", form).forEach(el => {
      if (el.name && data[el.name] != null) el.value = data[el.name];
    });
    $all("input[type=radio]", form).forEach(el => {
      if (data[el.name] === el.value) el.checked = true;
    });
    $all("input[type=checkbox]", form).forEach(el => {
      if (typeof data[el.name] === "boolean") el.checked = data[el.name];
    });
  }

  let saveTimer = null;
  function scheduleSave() {
    const status = document.getElementById("save-status");
    if (status) { status.textContent = "Saving"; status.classList.remove("saved"); }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(collect())); } catch (e) {}
      if (status) {
        const t = new Date();
        const hh = String(t.getHours()).padStart(2, "0");
        const mm = String(t.getMinutes()).padStart(2, "0");
        status.textContent = "Saved · " + hh + ":" + mm;
        status.classList.add("saved");
      }
    }, 500);
  }

  function bindAutosave() {
    const form = document.querySelector(FORM_SELECTOR);
    if (!form) return;
    form.addEventListener("input", scheduleSave);
    form.addEventListener("change", scheduleSave);
    // Auto-grow textareas
    $all("textarea", form).forEach(t => {
      const grow = () => { t.style.height = "auto"; t.style.height = (t.scrollHeight + 2) + "px"; };
      t.addEventListener("input", grow);
      // initial grow after restore
      setTimeout(grow, 0);
    });
  }

  // -------- Markdown export --------
  function getVal(name) {
    const el = document.querySelector('[name="' + CSS.escape(name) + '"]');
    if (!el) return "";
    if (el.type === "checkbox") return el.checked ? "Yes" : "No";
    return (el.value || "").trim();
  }
  function getRadio(name) {
    const el = document.querySelector('input[name="' + CSS.escape(name) + '"]:checked');
    return el ? el.value : "";
  }
  function getMulti(prefix) {
    return $all('input[type=checkbox]')
      .filter(c => c.name.startsWith(prefix) && c.checked)
      .map(c => c.dataset.label || c.value);
  }

  function md() {
    const lines = [];
    const client = getVal("meta_client") || "{CLIENT_NAME}";
    const date   = getVal("meta_date") || "";
    const lead   = getVal("meta_lead") || "";
    const email  = getVal("meta_email") || "";

    lines.push("# Strategy Intake — " + client);
    lines.push("*the DK | creative studio*");
    lines.push("");
    if (date)  lines.push("**Date:** " + date);
    if (lead)  lines.push("**Lead:** " + lead);
    if (email) lines.push("**Email:** " + email);
    lines.push("");
    lines.push("---");
    lines.push("");

    const sections = [
      { num: "01", title: "Foundation", questions: [
        { id: "brand_type", q: "Brand type" },
        { id: "brand_type_note", q: "What this brand actually is" },
        { id: "q1_1", q: "Why does this brand exist? Why did you start it?" },
        { id: "q1_2", q: "In 5 years, what does success look like?" },
        { id: "q1_3", q: "What would have to be true for this brand to fail on its own terms?" },
        { id: "q1_4", q: "One brand whose posture you envy." },
      ]},
      { num: "02", title: "Audience", questions: [
        { id: "q2_1", q: "Describe the ideal client/customer/guest in concrete terms." },
        { id: "q2_1b_shelf", q: "Product · where it lives" },
        { id: "q2_1b_price", q: "Product · price point" },
        { id: "q2_1b_rivals", q: "Product · comparison set" },
        { id: "q2_1b_category", q: "Product · category descriptor" },
        { id: "q2_1b_pickup", q: "Product · why pick this up?" },
        { id: "q2_1c_location", q: "Destination · location" },
        { id: "q2_1c_geo", q: "Destination · where guests come from" },
        { id: "q2_1c_season", q: "Destination · season" },
        { id: "q2_1c_stay", q: "Destination · length of stay" },
        { id: "q2_1c_arrival", q: "Destination · arrival" },
        { id: "q2_1c_return", q: "Destination · return / not return" },
        { id: "q2_2", q: "Three options in front of them. Why do they choose yours?" },
        { id: "q2_3_right", q: "Right fit (names + one sentence each)." },
        { id: "q2_3_wrong", q: "Wrong fit (name + the specific friction)." },
      ]},
      { num: "03", title: "Point of View", questions: [
        { id: "q3_1", q: "What does the rest of your industry get wrong?" },
        { id: "q3_2_a", q: "We believe ____. (1)" },
        { id: "q3_2_b", q: "We believe ____. (2)" },
        { id: "q3_2_c", q: "We believe ____. (3)" },
        { id: "q3_3", q: "What inspires you, lately?" },
      ]},
      { num: "04", title: "Personality & Voice", questions: [
        { id: "q4_1_1", q: "Personality word 1" },
        { id: "q4_1_2", q: "Personality word 2" },
        { id: "q4_1_3", q: "Personality word 3" },
        { id: "q4_1_4", q: "Personality word 4" },
        { id: "q4_1_5", q: "Personality word 5" },
        { id: "q4_1_6", q: "Personality word 6" },
        { id: "q4_5", q: "Throwaway introduction (2–3 sentences)" },
        { id: "q4_6", q: "When someone has a great experience — what words do you hope they use?" },
      ]},
      { num: "05", title: "Selectivity", questions: [
        { id: "q5_1", q: "The hard filter — we don't serve / sell to / work with ____." },
        { id: "q5_2", q: "The green flags." },
        { id: "q5_3", q: "Where's the floor?" },
        { id: "q5_4", q: "The strategic exception." },
      ]},
    ];

    sections.forEach(sec => {
      lines.push("## " + sec.num + " — " + sec.title);
      lines.push("");
      sec.questions.forEach(q => {
        const v = getVal(q.id);
        lines.push("**" + q.q + "**");
        lines.push("");
        lines.push(v ? v : "_(no answer)_");
        lines.push("");
      });
      // section-specific extras
      if (sec.num === "04") {
        lines.push("### Voice sliders (0 = left pole · 50 = middle · 100 = right pole)");
        [
          ["Warm", "Cool", "pair_warmth"],
          ["Formal", "Casual", "pair_register"],
          ["Certain", "Curious", "pair_conviction"],
          ["Classic", "Contemporary", "pair_era"],
          ["Restrained", "Expressive", "pair_volume"],
          ["Serious", "Playful", "pair_tone"],
        ].forEach(([left, right, name]) => {
          lines.push("- " + left + " / " + right + ": **" + (getVal(name) || "50") + "**");
        });
        lines.push("");
        const tw = getRadio("three_ways");
        lines.push("### Three-ways pick");
        lines.push("- Picked: **" + (tw || "—") + "**");
        lines.push("- Why: " + (getVal("three_ways_why") || "—"));
        lines.push("");
        lines.push("### Cringe list (yes = cringes)");
        const cringes = getMulti("cringe_");
        if (cringes.length === 0) lines.push("_(none flagged)_");
        else cringes.forEach(c => lines.push("- " + c));
        const cringeCustom = getVal("cringe_custom");
        if (cringeCustom) lines.push("- Their own: " + cringeCustom);
        lines.push("");
      }
      if (sec.num === "05") {
        lines.push("### Where we draw the line (Yes = we won't do this)");
        [
          "Competing on price to win business",
          "Compromising on quality to hit a price point",
          "Wholesale or distribution that requires diluting the brand",
          "Taking on volume that compromises the experience",
          "Partnerships with brands that conflict with our positioning",
          "Expanding into markets we're not ready to serve well",
        ].forEach((label, i) => {
          const v = getRadio("dontdo_" + i);
          lines.push("- " + label + ": **" + (v || "—") + "**");
        });
        lines.push("- Anything specific to your industry: " + (getVal("dontdo_industries") || "—"));
        lines.push("");
      }
      lines.push("---");
      lines.push("");
    });

    return lines.join("\n");
  }

  function download(filename, text) {
    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
  }

  // -------- Send to studio (parallel: Web3Forms email + Google Sheets) --------
  function sendEmail(client, lead, email, date, markdown) {
    const payload = {
      access_key: WEB3FORMS_ACCESS_KEY,
      subject: "Strategy intake — " + client + " (" + lead + ")",
      from_name: "DK Strategy Intake",
      client: client,
      contact: lead,
      date: date,
      message: markdown
    };
    // If the client provided an email, route it as reply_to so you can
    // reply directly from your inbox without copy-pasting from the form.
    if (email) payload.replyto = email;
    return fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload)
    }).then(r => r.json().then(j => {
      if (!r.ok || j.success === false) throw new Error(j.message || "email failed");
      return j;
    }));
  }

  function sendToSheet(rawData, markdown) {
    // Apps Script web apps reject custom Content-Type to avoid CORS preflight,
    // so post text/plain with a JSON body — the script parses e.postData.contents.
    return fetch(SHEETS_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(Object.assign({}, rawData, {
        submitted_at: new Date().toISOString(),
        markdown: markdown
      }))
    }).then(r => {
      if (!r.ok) throw new Error("sheet failed");
      return r;
    });
  }

  async function submit(submitBtn) {
    const status = document.getElementById("save-status");
    const setStatus = (msg) => { if (status) status.textContent = msg; };

    const client = getVal("meta_client") || "Untitled brand";
    const lead   = getVal("meta_lead")   || "Unknown contact";
    const email  = getVal("meta_email")  || "";
    const date   = getVal("meta_date")   || "";
    const markdown = md();
    const raw      = collect();

    const tasks = [];
    const labels = [];
    if (WEB3FORMS_ACCESS_KEY && WEB3FORMS_ACCESS_KEY !== "PASTE_YOUR_WEB3FORMS_ACCESS_KEY") {
      tasks.push(sendEmail(client, lead, email, date, markdown));
      labels.push("email");
    }
    if (SHEETS_WEBHOOK_URL && SHEETS_WEBHOOK_URL !== "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL") {
      tasks.push(sendToSheet(raw, markdown));
      labels.push("sheet");
    }
    if (tasks.length === 0) {
      setStatus("Submission endpoints not set up yet — see intake.js");
      return;
    }

    if (submitBtn) submitBtn.disabled = true;
    setStatus("Sending");

    const results = await Promise.allSettled(tasks);
    const ok   = results.filter(r => r.status === "fulfilled").length;
    const fail = results.length - ok;

    if (ok === results.length) {
      setStatus("Sent · the studio will be in touch");
      if (submitBtn) { submitBtn.textContent = "Sent"; submitBtn.disabled = true; }
    } else if (ok > 0) {
      setStatus("Partially sent · " + fail + " channel failed — markdown export still available");
      if (submitBtn) submitBtn.disabled = false;
    } else {
      setStatus("Send failed — export markdown as a backup");
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  function bindToolbar() {
    const submitBtn = document.getElementById("btn-submit");
    const exportBtn = document.getElementById("btn-export");
    const printBtn  = document.getElementById("btn-print");
    const resetBtn  = document.getElementById("btn-reset");
    if (submitBtn) submitBtn.addEventListener("click", () => submit(submitBtn));
    if (exportBtn) exportBtn.addEventListener("click", () => {
      const client = getVal("meta_client") || "intake";
      const slug = client.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      download((slug || "intake") + ".md", md());
    });
    if (printBtn) printBtn.addEventListener("click", () => window.print());
    if (resetBtn) resetBtn.addEventListener("click", () => {
      if (!confirm("Clear every answer on this form? This cannot be undone.")) return;
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      const form = document.querySelector(FORM_SELECTOR);
      $all("textarea, input[type=text]", form).forEach(el => el.value = "");
      $all("input[type=checkbox], input[type=radio]", form).forEach(el => el.checked = false);
      $all("textarea", form).forEach(t => { t.style.height = ""; });
      const status = document.getElementById("save-status");
      if (status) { status.textContent = "Cleared"; status.classList.add("saved"); }
      const sub = document.getElementById("btn-submit");
      if (sub) { sub.textContent = "Send to studio"; sub.disabled = false; }
    });
  }

  function bindBrandType() {
    const radios = document.querySelectorAll('input[name="brand_type"]');
    const apply = () => {
      const sel = document.querySelector('input[name="brand_type"]:checked');
      if (sel) document.body.dataset.bt = sel.value;
      else delete document.body.dataset.bt;
    };
    radios.forEach(r => r.addEventListener("change", apply));
    apply();
  }

  document.addEventListener("DOMContentLoaded", () => {
    restore();
    bindAutosave();
    bindToolbar();
    bindBrandType();
  });
})();
