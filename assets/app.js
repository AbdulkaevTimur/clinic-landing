(function () {
  const KEY = "lumaDentalAppointments.v1";
  const slots = [
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "12:00",
    "12:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
    "17:00",
    "17:30",
    "18:00",
    "18:30",
  ];
  const serviceDefaults = {
    "Консультация": { doctor: "Алина Кравцова", room: "Кабинет диагностики" },
    "Профгигиена": { doctor: "Алина Кравцова", room: "Кабинет профилактики" },
    "Лечение кариеса": { doctor: "Алина Кравцова", room: "Кабинет терапии" },
    "Имплантация": { doctor: "Марк Левин", room: "Хирургический кабинет" },
    "Виниры": { doctor: "Тимур Рахманов", room: "Кабинет эстетики" },
    "Ортодонтия": { doctor: "Ева Сафина", room: "Ортодонтия" },
  };
  const monthNames = [
    "январь",
    "февраль",
    "март",
    "апрель",
    "май",
    "июнь",
    "июль",
    "август",
    "сентябрь",
    "октябрь",
    "ноябрь",
    "декабрь",
  ];
  const state = {
    month: startOfMonth(new Date()),
    selectedDate: todayISO(),
    selectedTime: "",
    selectedDoctor: "",
  };

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function toISO(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function parseISO(iso) {
    const [year, month, day] = iso.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function todayISO() {
    return toISO(new Date());
  }

  function minutesFromTime(time) {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  }

  function minutesNow(date = new Date()) {
    return date.getHours() * 60 + date.getMinutes();
  }

  function isPastSlot(date, time, now = new Date()) {
    const today = toISO(now);
    if (date < today) return true;
    if (date > today) return false;
    return minutesFromTime(time) <= minutesNow(now);
  }

  function isUnavailableSlot(date, time) {
    return isBooked(date, time) || isPastSlot(date, time);
  }

  function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function addMonths(date, amount) {
    return new Date(date.getFullYear(), date.getMonth() + amount, 1);
  }

  function formatDate(iso) {
    return parseISO(iso).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      weekday: "long",
    });
  }

  function formatSlotDate(iso) {
    const today = parseISO(todayISO());
    const date = parseISO(iso);
    const diff = Math.round((date - today) / 86400000);
    if (diff === 0) return "Сегодня";
    if (diff === 1) return "Завтра";
    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      weekday: "short",
    });
  }

  function formatHeroSlotDate(iso) {
    return parseISO(iso).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
    });
  }

  function createId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function normalizeAppointment(item) {
    const defaults = serviceDefaults[item.service] || serviceDefaults["Консультация"];
    return {
      id: item.id || createId(),
      name: item.name || "Пациент",
      phone: item.phone || "",
      service: item.service || "Консультация",
      doctor: item.doctor || defaults.doctor,
      room: item.room || defaults.room,
      note: item.note || "",
      date: item.date || todayISO(),
      time: item.time || slots[0],
      source: item.source || "site",
      status: item.status || "pending",
      createdAt: item.createdAt || new Date().toISOString(),
    };
  }

  function loadAppointments() {
    try {
      const raw = localStorage.getItem(KEY);
      const items = raw ? JSON.parse(raw) : [];
      return Array.isArray(items) ? items.map(normalizeAppointment) : [];
    } catch {
      return [];
    }
  }

  function saveAppointments(items) {
    localStorage.setItem(KEY, JSON.stringify(items.map(normalizeAppointment)));
  }

  function bookingsForDate(date) {
    return loadAppointments()
      .filter((item) => item.status !== "cancelled")
      .filter((item) => item.date === date)
      .sort((a, b) => a.time.localeCompare(b.time));
  }

  function isBooked(date, time) {
    return bookingsForDate(date).some((item) => item.time === time);
  }

  function bookingCount(date, time) {
    return bookingsForDate(date).filter((item) => item.time === time).length;
  }

  function appointmentsByDate() {
    return loadAppointments().reduce((acc, item) => {
      if (item.status === "cancelled") return acc;
      acc[item.date] = (acc[item.date] || 0) + 1;
      return acc;
    }, {});
  }

  function findNextSlots(limit = 3) {
    const today = parseISO(todayISO());
    const found = [];
    for (let day = 0; day < 45 && found.length < limit; day += 1) {
      const candidate = new Date(today);
      candidate.setDate(today.getDate() + day);
      const iso = toISO(candidate);
      slots.forEach((time) => {
        if (found.length < limit && !isUnavailableSlot(iso, time)) {
          found.push({ date: iso, time });
        }
      });
    }
    return found;
  }

  function calendarDates(month) {
    const first = startOfMonth(month);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(first.getDate() - offset);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }

  function renderNextSlots() {
    const list = document.querySelector("[data-next-slots]");
    if (!list) return;

    const nextSlots = findNextSlots(3);
    if (!nextSlots.length) {
      list.innerHTML = "<li>Оставьте заявку, администратор подберет время</li>";
      return;
    }

    list.innerHTML = "";
    nextSlots.forEach((slot) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      const count = bookingCount(slot.date, slot.time);
      button.type = "button";
      button.dataset.heroSlotDate = slot.date;
      button.dataset.heroSlotTime = slot.time;
      button.title = `Сейчас записано: ${count}`;
      button.setAttribute("aria-label", `${formatSlotDate(slot.date)}, ${slot.time}. Сейчас записано: ${count}`);
      button.innerHTML = `<span>${formatHeroSlotDate(slot.date)}</span><strong>${slot.time}</strong>`;
      item.append(button);
      list.append(item);
    });
  }

  function renderCalendar() {
    const grid = document.querySelector("[data-calendar-grid]");
    const label = document.querySelector("[data-calendar-label]");
    if (!grid || !label) return;

    const counts = appointmentsByDate();
    const today = todayISO();
    label.textContent = `${monthNames[state.month.getMonth()]} ${state.month.getFullYear()}`;
    grid.innerHTML = "";

    calendarDates(state.month).forEach((date) => {
      const iso = toISO(date);
      const button = document.createElement("button");
      const outside = date.getMonth() !== state.month.getMonth();
      const past = iso < today;
      button.type = "button";
      button.className = "day-cell";
      button.textContent = date.getDate();
      button.dataset.date = iso;
      if (outside) button.classList.add("is-outside");
      if (past) button.classList.add("is-past");
      if (iso === state.selectedDate) button.classList.add("is-selected");
      if (counts[iso]) {
        button.classList.add("has-bookings");
        button.dataset.count = counts[iso];
      }
      if (past) button.disabled = true;
      button.addEventListener("click", () => {
        state.selectedDate = iso;
        state.selectedTime = "";
        renderAll();
      });
      grid.append(button);
    });
  }

  function renderPatientSlots() {
    const grid = document.querySelector("[data-slot-grid]");
    const dateLabel = document.querySelector("[data-selected-date-label]");
    const dateInput = document.querySelector("[data-selected-date]");
    const timeInput = document.querySelector("[data-selected-time]");
    const doctorSelect = document.querySelector("[data-doctor-select]");
    if (!grid || !dateLabel || !dateInput || !timeInput) return;

    if (state.selectedTime && isUnavailableSlot(state.selectedDate, state.selectedTime)) {
      state.selectedTime = "";
    }
    dateLabel.textContent = formatDate(state.selectedDate);
    dateInput.value = state.selectedDate;
    timeInput.value = state.selectedTime;
    if (doctorSelect && state.selectedDoctor && doctorSelect.value !== state.selectedDoctor) {
      doctorSelect.value = state.selectedDoctor;
    }
    grid.innerHTML = "";

    slots.forEach((time) => {
      const booked = isBooked(state.selectedDate, time);
      const past = isPastSlot(state.selectedDate, time);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "slot-button";
      button.textContent = time;
      button.disabled = booked || past;
      if (booked) button.classList.add("is-booked");
      if (past) button.classList.add("is-past");
      if (time === state.selectedTime) button.classList.add("is-selected");
      button.addEventListener("click", () => {
        if (isUnavailableSlot(state.selectedDate, time)) return;
        state.selectedTime = time;
        renderPatientSlots();
      });
      grid.append(button);
    });
  }

  function renderAll() {
    renderCalendar();
    renderPatientSlots();
    renderNextSlots();
  }

  function selectBookingContext(service, doctor) {
    const serviceSelect = document.querySelector("[data-service-select]");
    const doctorSelect = document.querySelector("[data-doctor-select]");
    if (serviceSelect && service) serviceSelect.value = service;
    state.selectedDoctor = doctor || (serviceDefaults[service] || {}).doctor || doctorSelect?.value || "";
    if (doctorSelect && state.selectedDoctor) doctorSelect.value = state.selectedDoctor;
    renderPatientSlots();
    document.getElementById("booking")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function bindBooking() {
    document.querySelector("[data-calendar-prev]")?.addEventListener("click", () => {
      state.month = addMonths(state.month, -1);
      renderAll();
    });

    document.querySelector("[data-calendar-next]")?.addEventListener("click", () => {
      state.month = addMonths(state.month, 1);
      renderAll();
    });

    document.querySelector("[data-next-slots]")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-hero-slot-date]");
      if (!button) return;
      state.selectedDate = button.dataset.heroSlotDate;
      state.selectedTime = button.dataset.heroSlotTime;
      state.month = startOfMonth(parseISO(state.selectedDate));
      renderAll();
      document.getElementById("booking")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    document.querySelectorAll("[data-service-shortcut]").forEach((button) => {
      button.addEventListener("click", () => {
        selectBookingContext(button.dataset.serviceShortcut || "", button.dataset.doctorShortcut || "");
      });
    });

    document.querySelector("[data-service-select]")?.addEventListener("change", (event) => {
      const service = event.target.value;
      const doctorSelect = document.querySelector("[data-doctor-select]");
      state.selectedDoctor = (serviceDefaults[service] || {}).doctor || "";
      if (doctorSelect) doctorSelect.value = state.selectedDoctor;
      renderPatientSlots();
    });

    document.querySelector("[data-doctor-select]")?.addEventListener("change", (event) => {
      state.selectedDoctor = event.target.value;
      renderPatientSlots();
    });

    document.querySelector("[data-booking-form]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const status = document.querySelector("[data-booking-status]");
      if (!form.reportValidity()) return;
      if (!state.selectedDate || !state.selectedTime) {
        if (status) status.textContent = "Выберите дату и время.";
        return;
      }
      if (isBooked(state.selectedDate, state.selectedTime)) {
        if (status) status.textContent = "Этот слот уже занят. Выберите другое время.";
        renderAll();
        return;
      }
      if (isPastSlot(state.selectedDate, state.selectedTime)) {
        if (status) status.textContent = "Это время уже прошло. Выберите другое свободное окно.";
        state.selectedTime = "";
        renderAll();
        return;
      }

      const data = Object.fromEntries(new FormData(form).entries());
      const defaults = serviceDefaults[data.service] || serviceDefaults["Консультация"];
      const items = loadAppointments();
      items.push({
        id: createId(),
        name: data.name.trim(),
        phone: data.phone.trim(),
        service: data.service,
        doctor: data.doctor,
        room: defaults.room,
        note: data.note.trim(),
        date: state.selectedDate,
        time: state.selectedTime,
        source: "site",
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      saveAppointments(items);
      form.reset();
      state.selectedTime = "";
      state.selectedDoctor = "";
      if (status) status.textContent = "Заявка принята. Администратор свяжется с вами для подтверждения записи.";
      renderAll();
    });
  }

  function bindHeader() {
    const header = document.querySelector("[data-site-header]");
    if (!header) return;
    const toggle = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 18);
    };
    toggle();
    window.addEventListener("scroll", toggle, { passive: true });
  }

  function bindReveal() {
    const elements = document.querySelectorAll(".reveal");
    if (!elements.length) return;
    if (!("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px 18% 0px" },
    );

    elements.forEach((element) => observer.observe(element));
  }

  function bindSnapSlider(config) {
    const {
      sliderSelector,
      cardSelector,
      prevSelector,
      nextSelector,
      hintSelector,
      parallaxTargetSelector,
      parallaxProperty,
      parallaxFrom = 0,
      parallaxTo = 0,
    } = config;
    const slider = document.querySelector(sliderSelector);
    const cards = slider ? Array.from(slider.querySelectorAll(cardSelector)) : [];
    const prev = document.querySelector(prevSelector);
    const next = document.querySelector(nextSelector);
    const hint = document.querySelector(hintSelector);
    const parallaxTarget = parallaxTargetSelector ? document.querySelector(parallaxTargetSelector) : null;
    if (!slider || cards.length < 2 || !prev || !next) return;

    const targetFor = (index) => cards[index].offsetLeft - cards[0].offsetLeft;
    const updateParallax = () => {
      if (!parallaxTarget || !parallaxProperty) return;

      const maxScroll = Math.max(slider.scrollWidth - slider.clientWidth, targetFor(cards.length - 1), 1);
      const ratio = Math.min(Math.max(slider.scrollLeft / maxScroll, 0), 1);
      const position = parallaxFrom + (parallaxTo - parallaxFrom) * ratio;
      parallaxTarget.style.setProperty(parallaxProperty, `${position.toFixed(2)}%`);
    };
    const currentIndex = () => {
      const current = slider.scrollLeft;
      return cards.reduce((nearest, card, index) => {
        const distance = Math.abs(targetFor(index) - current);
        return distance < nearest.distance ? { index, distance } : nearest;
      }, { index: 0, distance: Infinity }).index;
    };
    const update = () => {
      const index = currentIndex();
      updateParallax();
      prev.disabled = index <= 0;
      next.disabled = index >= cards.length - 1;
      cards.forEach((card, cardIndex) => {
        card.toggleAttribute("data-active", cardIndex === index);
      });
      if (hint) hint.textContent = `${index + 1} / ${cards.length} · листайте`;
    };
    const scrollToIndex = (index) => {
      const targetIndex = Math.min(Math.max(index, 0), cards.length - 1);
      slider.scrollTo({
        left: targetFor(targetIndex),
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
      window.setTimeout(update, 260);
    };
    const mobileSliderQuery = window.matchMedia("(max-width: 899px)");
    let touchGesture = null;
    const resetTouchGesture = () => {
      touchGesture = null;
    };
    const pointFromTouch = (event) => {
      const touch = event.touches?.[0] || event.changedTouches?.[0];
      return touch ? { x: touch.clientX, y: touch.clientY } : null;
    };
    const lockVerticalGesture = (event) => {
      if (!mobileSliderQuery.matches) return;

      const point = pointFromTouch(event);
      if (!point) return;

      const dx = point.x - touchGesture.startX;
      const dy = point.y - touchGesture.startY;
      if (!touchGesture.axis && Math.hypot(dx, dy) > 8) {
        if (Math.abs(dy) > Math.abs(dx) * 1.15) touchGesture.axis = "y";
        if (Math.abs(dx) > Math.abs(dy) * 1.15) touchGesture.axis = "x";
      }

      if (touchGesture.axis === "y") {
        slider.scrollLeft = touchGesture.startScrollLeft;
      }
    };

    prev.addEventListener("click", () => scrollToIndex(currentIndex() - 1));
    next.addEventListener("click", () => scrollToIndex(currentIndex() + 1));
    slider.addEventListener("touchstart", (event) => {
      if (!mobileSliderQuery.matches) return;

      const point = pointFromTouch(event);
      if (!point) return;

      touchGesture = {
        axis: null,
        startScrollLeft: slider.scrollLeft,
        startX: point.x,
        startY: point.y,
      };
    }, { passive: true });
    slider.addEventListener("touchmove", (event) => {
      if (!touchGesture) return;
      lockVerticalGesture(event);
    }, { passive: true });
    slider.addEventListener("touchend", () => {
      if (touchGesture?.axis === "y") {
        slider.scrollLeft = touchGesture.startScrollLeft;
        window.requestAnimationFrame(update);
      }
      resetTouchGesture();
    }, { passive: true });
    slider.addEventListener("touchcancel", resetTouchGesture, { passive: true });
    slider.addEventListener("wheel", (event) => {
      if (!mobileSliderQuery.matches || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;

      const scrollLeft = slider.scrollLeft;
      window.requestAnimationFrame(() => {
        slider.scrollLeft = scrollLeft;
      });
    }, { passive: true });
    slider.addEventListener("scroll", () => window.requestAnimationFrame(update), { passive: true });
    window.addEventListener("resize", update, { passive: true });
    update();
  }

  function bindMobileSliders() {
    bindSnapSlider({
      sliderSelector: "[data-doctor-slider]",
      cardSelector: "[data-doctor-card]",
      prevSelector: "[data-doctor-prev]",
      nextSelector: "[data-doctor-next]",
      hintSelector: ".doctor-swipe-hint",
      parallaxTargetSelector: ".doctors-section",
      parallaxProperty: "--doctor-bg-shift",
      parallaxFrom: 12,
      parallaxTo: -12,
    });
    bindSnapSlider({
      sliderSelector: "[data-process-slider]",
      cardSelector: "[data-process-card]",
      prevSelector: "[data-process-prev]",
      nextSelector: "[data-process-next]",
      hintSelector: ".process-swipe-hint",
    });
    bindSnapSlider({
      sliderSelector: "[data-service-slider]",
      cardSelector: "[data-service-card]",
      prevSelector: "[data-service-prev]",
      nextSelector: "[data-service-next]",
      hintSelector: ".service-swipe-hint",
      parallaxTargetSelector: ".services-section",
      parallaxProperty: "--services-bg-shift",
      parallaxFrom: 10,
      parallaxTo: -10,
    });
  }

  bindHeader();
  bindReveal();
  bindBooking();
  bindMobileSliders();
  renderAll();
})();
