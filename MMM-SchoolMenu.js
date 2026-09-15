Module.register("MMM-SchoolMenu", {
  defaults: {
    daysToShow: 1, // Default is 1 (nur heute)
    imageHeight: "120px", // Configurable image height (follows MM defaults)
    maxHeight: "none", // Optional max container height
    updateInterval: 60 * 60 * 1000, // 1 hour
    highlightToday: true,
    showBadges: true,
    showAllergens: false,
    headerTitle: "Schulmenü Tamm"
  },

  getStyles() {
    return ["MMM-SchoolMenu.css"];
  },

  start() {
    Log.info("Starting module: " + this.name);
    this.menuDays = [];
    this.loading = true;
    this.errorMessage = null;

    // Backward compatibility for showAllWeek
    if (this.config.showAllWeek !== undefined && this.config.daysToShow === undefined) {
      this.config.daysToShow = this.config.showAllWeek ? 5 : 1;
    }

    // Send config to node_helper to start fetching
    this.sendSocketNotification("CONFIG", this.config);

    // Schedule regular update
    setInterval(() => {
      this.sendSocketNotification("FETCH_MENU");
    }, this.config.updateInterval);
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "MENU_DATA") {
      this.loading = false;
      this.errorMessage = null;
      this.menuDays = payload;
      this.updateDom(400);
    } else if (notification === "IMAGE_UPDATED") {
      if (this.menuDays && this.menuDays.length > 0) {
        let updated = false;
        this.menuDays.forEach((day) => {
          day.menus.forEach((menu) => {
            if (menu.slug === payload.slug) {
              menu.hasImage = true;
              updated = true;
            }
          });
        });
        if (updated) {
          this.updateDom(300);
        }
      }
    } else if (notification === "MENU_ERROR") {
      this.errorMessage = payload.message;
      this.loading = false;
      this.updateDom();
    }
  },

  getDaysToDisplay() {
    if (!this.menuDays || this.menuDays.length === 0) return [];

    const daysCount = Math.max(1, Math.min(parseInt(this.config.daysToShow, 10) || 1, this.menuDays.length));
    const todayDateStr = new Date().toISOString().split("T")[0];

    // Find index of today
    let todayIdx = this.menuDays.findIndex((d) => d.isToday || d.dateStr === todayDateStr);

    // On weekends (Saturday / Sunday) or if today not in loaded week, start at index 0 (Montag of the upcoming week)
    if (todayIdx === -1) {
      todayIdx = 0;
    }

    // If starting from todayIdx would exceed length, adjust or show from todayIdx
    let endIdx = todayIdx + daysCount;
    if (endIdx > this.menuDays.length) {
      // If single day requested at end of week (or Friday), keep todayIdx
      if (daysCount === 1) {
        return [this.menuDays[todayIdx]];
      }
      return this.menuDays.slice(Math.max(0, this.menuDays.length - daysCount));
    }

    return this.menuDays.slice(todayIdx, endIdx);
  },

  getDom() {
    const wrapper = document.createElement("div");
    wrapper.className = "mmm-schoolmenu-container";

    // Set custom CSS variables for configurable heights
    if (this.config.imageHeight) {
      wrapper.style.setProperty("--sm-image-height", this.config.imageHeight);
    }
    if (this.config.maxHeight && this.config.maxHeight !== "none" && this.config.maxHeight !== "auto") {
      wrapper.style.maxHeight = this.config.maxHeight;
      wrapper.style.overflowY = "auto";
    }

    if (this.loading) {
      wrapper.innerHTML = '<div class="sm-loading"><i class="fa fa-spinner fa-spin"></i> Lade Schulmenü...</div>';
      return wrapper;
    }

    if (this.errorMessage) {
      wrapper.innerHTML = `<div class="sm-error"><i class="fa fa-exclamation-triangle"></i> Fehler: ${this.errorMessage}</div>`;
      return wrapper;
    }

    const daysToRender = this.getDaysToDisplay();
    if (daysToRender.length === 0) {
      wrapper.innerHTML = '<div class="sm-empty">Keine Menüdaten verfügbar.</div>';
      return wrapper;
    }

    wrapper.style.setProperty("--days-count", daysToRender.length);

    // Header
    const header = document.createElement("div");
    header.className = "sm-header";
    header.innerHTML = `<span class="sm-title"><i class="fa fa-utensils"></i> ${this.config.headerTitle}</span>`;
    wrapper.appendChild(header);

    // Days Container
    const daysContainer = document.createElement("div");
    daysContainer.className = "sm-days-grid count-" + daysToRender.length;

    const todayDateStr = new Date().toISOString().split("T")[0];

    daysToRender.forEach((day) => {
      const isToday = day.isToday || day.dateStr === todayDateStr;
      const dayCard = document.createElement("div");
      dayCard.className = "sm-day-card" + (isToday && this.config.highlightToday ? " is-today" : "");

      // Day Title Header
      const dayHeader = document.createElement("div");
      dayHeader.className = "sm-day-header";
      dayHeader.innerHTML = `
        <div class="sm-day-header-left">
          <span class="sm-day-name">${day.dayName}</span>
          <span class="sm-day-date">${day.displayDate || ""}</span>
        </div>
        ${isToday ? '<span class="sm-today-badge">HEUTE</span>' : ""}
      `;
      dayCard.appendChild(dayHeader);

      // Menus Container
      const menusList = document.createElement("div");
      menusList.className = "sm-menus-list";

      day.menus.forEach((menu) => {
        if (menu.isEmpty) return;

        const menuRow = document.createElement("div");
        menuRow.className = "sm-menu-item";

        // Badges
        let badgeHtml = "";
        if (this.config.showBadges) {
          if (menu.isVegetarian) {
            badgeHtml += '<span class="sm-badge badge-veggie" title="Vegetarisch">🌱 Veggie</span>';
          }
          if (menu.isPoultry) {
            badgeHtml += '<span class="sm-badge badge-poultry" title="Geflügel">🍗 Geflügel</span>';
          }
          if (menu.isFish) {
            badgeHtml += '<span class="sm-badge badge-fish" title="Fisch">🐟 Fisch</span>';
          }
        }

        // Image or placeholder
        const imgContainer = document.createElement("div");
        imgContainer.className = "sm-dish-image-wrapper";

        if (menu.hasImage) {
          const img = document.createElement("img");
          img.src = this.file(`pics/${menu.imageFile}`) + `?t=${Date.now()}`;
          img.className = "sm-dish-image";
          img.alt = menu.cleanDish;
          imgContainer.appendChild(img);
        } else {
          imgContainer.innerHTML = `
            <div class="sm-dish-placeholder">
              <i class="fa fa-bowl-food"></i>
              <span>Foto wird generiert...</span>
            </div>
          `;
        }

        // Details Container
        const detailsContainer = document.createElement("div");
        detailsContainer.className = "sm-dish-details";

        const categoryTag = `<span class="sm-category-tag">${menu.category}</span>`;
        const dishTitle = `<div class="sm-dish-title">${menu.cleanDish}</div>`;
        const allergensInfo = this.config.showAllergens && menu.allergens
          ? `<div class="sm-dish-allergens">${menu.allergens}</div>`
          : "";

        detailsContainer.innerHTML = `
          <div class="sm-dish-meta">
            ${categoryTag}
            ${badgeHtml}
          </div>
          ${dishTitle}
          ${allergensInfo}
        `;

        menuRow.appendChild(imgContainer);
        menuRow.appendChild(detailsContainer);
        menusList.appendChild(menuRow);
      });

      dayCard.appendChild(menusList);
      daysContainer.appendChild(dayCard);
    });

    wrapper.appendChild(daysContainer);
    return wrapper;
  }
});
