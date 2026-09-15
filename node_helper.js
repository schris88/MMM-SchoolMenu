const NodeHelper = require("node_helper");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

module.exports = NodeHelper.create({
  start() {
    console.log("[MMM-SchoolMenu] Node Helper started.");
    this.picsDir = path.join(__dirname, "pics");
    if (!fs.existsSync(this.picsDir)) {
      fs.mkdirSync(this.picsDir, { recursive: true });
    }
    this.generationQueue = [];
    this.isGenerating = false;
    this.cachedMenu = null;
    this.lastFetched = 0;
  },

  safeSendSocketNotification(notification, payload) {
    try {
      if (this.io) {
        this.sendSocketNotification(notification, payload);
      }
    } catch (e) {
      console.warn(`[MMM-SchoolMenu] Could not send socket notification ${notification}:`, e.message);
    }
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "CONFIG") {
      this.config = payload;
      this.fetchAndProcessMenu();
    } else if (notification === "FETCH_MENU") {
      this.fetchAndProcessMenu(true);
    }
  },

  fetchMenuHtml() {
    return new Promise((resolve, reject) => {
      const url = "https://tamm.inetmenue.de/fs/menu/week";
      https.get(url, { headers: { "User-Agent": "Mozilla/5.0 MagicMirror/MMM-SchoolMenu" } }, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      }).on("error", reject);
    });
  },

  generateDishSlug(text) {
    if (!text) return "unbekannt";
    let s = text.toLowerCase();
    s = s.replace(/ä/g, "ae")
         .replace(/ö/g, "oe")
         .replace(/ü/g, "ue")
         .replace(/ß/g, "ss");
    s = s.replace(/[^a-z0-9\s]/g, " ");
    const words = s.split(/\s+/).filter((w) => w.length > 1);
    const ignoreWords = ["mit", "und", "dazu", "einer", "einem", "anschliessend", "in", "an", "auf", "vom", "von"];
    const coreWords = words.filter((w) => !ignoreWords.includes(w));
    const chosen = (coreWords.length > 0 ? coreWords : words).slice(0, 6);
    return chosen.join("_") || "gericht";
  },

  parseMenuHtml(html) {
    const days = [];
    const headerSectionMatch = html.match(/<section class="day-header[\s\S]*?<\/section>/);
    if (headerSectionMatch) {
      const dayRegex = /<a[^>]*class="[^"]*day\s*([^"]*)"[^>]*href="\/fs\/menu\/day\/([^"]+)"[^>]*>[\s\S]*?<span class="long">\s*([A-Za-zäöüÄÖÜß]+)[\s\S]*?<small>([^<]+)<\/small>/g;
      let match;
      while ((match = dayRegex.exec(headerSectionMatch[0])) !== null) {
        const isToday = match[1].includes("today");
        days.push({
          dateStr: match[2],
          dayName: match[3].trim(),
          displayDate: match[4].trim(),
          isToday: isToday,
          menus: []
        });
      }
    }

    const menuLineRegex = /<section class="menu-line[^"]*"[\s\S]*?<\/section>/g;
    let lineMatch;

    while ((lineMatch = menuLineRegex.exec(html)) !== null) {
      const lineHtml = lineMatch[0];
      const titleMatch = lineHtml.match(/<h4 title="([^"]+)"/i);
      if (!titleMatch) continue;
      const menuCategory = titleMatch[1].trim();

      // STRICT REQUIREMENT: Ignore "snack" and "pastabuffet" (case insensitive)
      const lowerCat = menuCategory.toLowerCase();
      if (lowerCat.includes("snack") || lowerCat.includes("pastabuffet") || lowerCat.includes("pasta-buffet")) {
        continue;
      }

      const articleRegex = /<article class="menu\s+([^"]*day[^"]*)"[\s\S]*?<\/article>/g;
      let artMatch;
      let dayIndex = 0;

      while ((artMatch = articleRegex.exec(lineHtml)) !== null) {
        const artHtml = artMatch[0];
        const dayClassMatch = artHtml.match(/menu-day-(\d+)/);
        const targetDayIndex = dayClassMatch ? parseInt(dayClassMatch[1], 10) : dayIndex;

        if (!days[targetDayIndex]) {
          dayIndex++;
          continue;
        }

        if (artHtml.includes("kein Essen") || artHtml.includes("no-menu")) {
          days[targetDayIndex].menus.push({
            category: menuCategory,
            dish: "Kein Essen",
            cleanDish: "",
            isEmpty: true,
            hasImage: false
          });
          dayIndex++;
          continue;
        }

        const productMatch = artHtml.match(/<div class="product">[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i);
        if (productMatch) {
          let rawDish = productMatch[1].trim();
          rawDish = rawDish
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .replace(/&euro;/g, "€");

          let isVegetarian = false;
          let isPoultry = false;
          let isFish = false;

          if (artHtml.includes('title="Vegetarisch"') || rawDish.includes("<V>")) isVegetarian = true;
          if (artHtml.includes('title="Geflügel"') || rawDish.includes("<G>")) isPoultry = true;
          if (artHtml.includes('title="Fisch"') || rawDish.includes("<F>")) isFish = true;

          let cleanDish = rawDish
            .replace(/<[A-Za-z0-9]+>/g, " ")
            .replace(/\[[^\]]*\]/g, " ")
            .replace(/\(\d+\)/g, " ")
            .replace(/\s+/g, " ")
            .trim();

          let allergens = "";
          const allergenMatch = artHtml.match(/<span class="allergens"[^>]*title="([^"]*)"/i);
          if (allergenMatch && allergenMatch[1]) {
            allergens = allergenMatch[1].trim();
          }

          const slug = this.generateDishSlug(cleanDish);
          const imageFileName = `${slug}.jpg`;
          const imageFilePath = path.join(this.picsDir, imageFileName);
          const hasImage = fs.existsSync(imageFilePath);

          days[targetDayIndex].menus.push({
            category: menuCategory,
            rawDish: rawDish,
            cleanDish: cleanDish,
            slug: slug,
            imageFile: imageFileName,
            imagePath: `/modules/MMM-SchoolMenu/pics/${imageFileName}`,
            hasImage: hasImage,
            isVegetarian,
            isPoultry,
            isFish,
            allergens,
            isEmpty: false
          });
        }

        dayIndex++;
      }
    }

    return days;
  },

  async fetchAndProcessMenu(force = false) {
    const now = Date.now();
    // Cache for 30 minutes unless forced
    if (!force && this.cachedMenu && now - this.lastFetched < 30 * 60 * 1000) {
      this.safeSendSocketNotification("MENU_DATA", this.cachedMenu);
      return;
    }

    try {
      console.log("[MMM-SchoolMenu] Fetching weekly menu from tamm.inetmenue.de...");
      const html = await this.fetchMenuHtml();
      const days = this.parseMenuHtml(html);
      this.cachedMenu = days;
      this.lastFetched = now;

      // Send immediate menu data to frontend
      this.safeSendSocketNotification("MENU_DATA", days);

      // Check for missing images and queue generation
      this.queueMissingImages(days);
    } catch (err) {
      console.error("[MMM-SchoolMenu] Error fetching menu:", err);
      this.safeSendSocketNotification("MENU_ERROR", { message: err.message });
    }
  },

  queueMissingImages(days) {
    days.forEach((day) => {
      day.menus.forEach((menu) => {
        if (menu.isEmpty || !menu.cleanDish) return;
        const targetPath = path.join(this.picsDir, menu.imageFile);
        if (!fs.existsSync(targetPath)) {
          // Only add if not already in queue
          const inQueue = this.generationQueue.some((item) => item.slug === menu.slug);
          if (!inQueue) {
            console.log(`[MMM-SchoolMenu] Queuing image generation for: "${menu.cleanDish}" -> ${menu.imageFile}`);
            this.generationQueue.push({
              cleanDish: menu.cleanDish,
              slug: menu.slug,
              imageFile: menu.imageFile,
              targetPath: targetPath
            });
          }
        }
      });
    });

    this.processGenerationQueue();
  },

  async processGenerationQueue() {
    if (this.isGenerating || this.generationQueue.length === 0) {
      return;
    }

    this.isGenerating = true;
    const item = this.generationQueue.shift();

    // Check again if image exists (could have been generated in previous cycle)
    if (fs.existsSync(item.targetPath)) {
      console.log(`[MMM-SchoolMenu] Image ${item.imageFile} already exists. Reusing.`);
      this.isGenerating = false;
      this.safeSendSocketNotification("IMAGE_UPDATED", { slug: item.slug, imageFile: item.imageFile });
      this.processGenerationQueue();
      return;
    }

    console.log(`[MMM-SchoolMenu] Starting AI image generation for "${item.cleanDish}"...`);

    try {
      await this.generateImageWithAgy(item);
      if (fs.existsSync(item.targetPath)) {
        console.log(`[MMM-SchoolMenu] Successfully generated & saved image: ${item.imageFile}`);
        // Notify frontend to refresh picture
        this.safeSendSocketNotification("IMAGE_UPDATED", { slug: item.slug, imageFile: item.imageFile });
      } else {
        console.warn(`[MMM-SchoolMenu] Image generation finished but ${item.imageFile} not found at target.`);
      }
    } catch (err) {
      console.error(`[MMM-SchoolMenu] Error generating image for ${item.slug}:`, err);
    } finally {
      this.isGenerating = false;
      // Wait 3 seconds before next generation to avoid CLI contention
      setTimeout(() => {
        this.processGenerationQueue();
      }, 3000);
    }
  },

  generateImageWithAgy(item) {
    return new Promise((resolve) => {
      // Prompt agy to use generate_image tool and copy the resulting file to the target path
      const prompt = `Use the generate_image tool to generate an appetizing, high-resolution food photo of the school lunch dish '${item.cleanDish}' served on a ceramic plate, styled like a fresh delicious meal. ImageName must be '${item.slug}'. After generating, copy the generated image file to '${item.targetPath}'.`;

      // Escape quotes for bash
      const escapedPrompt = prompt.replace(/"/g, '\\"');
      const cmd = `agy -p "${escapedPrompt}" --dangerously-skip-permissions`;

      console.log(`[MMM-SchoolMenu] Executing agy command...`);
      exec(cmd, { timeout: 120000, env: process.env }, (error, stdout, stderr) => {
        if (error) {
          console.error(`[MMM-SchoolMenu] agy exec error:`, error.message);
        }

        // If direct copy by agy didn't place the file, check ~/.gemini/antigravity-cli/brain/ for recent file
        if (!fs.existsSync(item.targetPath)) {
          this.recoverImageFromAgyBrain(item.slug, item.targetPath);
        }

        resolve();
      });
    });
  },

  recoverImageFromAgyBrain(slug, targetPath) {
    try {
      const homeDir = process.env.HOME || "/Users/christianstengel";
      const brainBase = path.join(homeDir, ".gemini", "antigravity-cli", "brain");
      if (!fs.existsSync(brainBase)) return;

      const convDirs = fs.readdirSync(brainBase);
      let newestFile = null;
      let newestMtime = 0;

      for (const conv of convDirs) {
        const convPath = path.join(brainBase, conv);
        if (fs.statSync(convPath).isDirectory()) {
          const files = fs.readdirSync(convPath);
          for (const f of files) {
            if (f.startsWith(slug) && (f.endsWith(".jpg") || f.endsWith(".png"))) {
              const fullF = path.join(convPath, f);
              const mtime = fs.statSync(fullF).mtimeMs;
              if (mtime > newestMtime) {
                newestMtime = mtime;
                newestFile = fullF;
              }
            }
          }
        }
      }

      if (newestFile && fs.existsSync(newestFile)) {
        console.log(`[MMM-SchoolMenu] Recovered image from agy brain: ${newestFile} -> ${targetPath}`);
        fs.copyFileSync(newestFile, targetPath);
      }
    } catch (err) {
      console.error("[MMM-SchoolMenu] Error recovering image from brain:", err);
    }
  }
});
