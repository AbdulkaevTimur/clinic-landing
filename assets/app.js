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
    const classifyTouchGesture = (event) => {
      if (!mobileSliderQuery.matches) return;

      const point = pointFromTouch(event);
      if (!point) return;

      const dx = point.x - touchGesture.startX;
      const dy = point.y - touchGesture.startY;

      if (!touchGesture.axis && Math.hypot(dx, dy) > 12) {
        if (Math.abs(dy) > 16 && Math.abs(dy) > Math.abs(dx) * 1.4) touchGesture.axis = "y";
        if (Math.abs(dx) > 16 && Math.abs(dx) > Math.abs(dy) * 1.1) touchGesture.axis = "x";
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
      classifyTouchGesture(event);
    }, { passive: true });
    slider.addEventListener("touchend", (event) => {
      if (touchGesture) classifyTouchGesture(event);
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

  function bindArqonEye() {
    const demo = document.querySelector("[data-arqon-eye]");
    if (!demo) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const logoReference = demo.dataset.logoReference;
    const pupil = demo.querySelector("[data-arqon-pupil]");
    const segmentLayer = demo.querySelector("[data-arqon-segments]");
    const letterLightLayer = demo.querySelector("[data-arqon-letter-lights]");
    if (!logoReference || !pupil || !segmentLayer || !letterLightLayer) return;

    const mark = {
      cx: 653,
      cy: 522,
    };

    const segmentModel = [
      { angle: -149.9 },
      { angle: -112.1 },
      { angle: -74.9 },
      { angle: -39.7 },
      { angle: -5.9 },
      { angle: 28.5, copper: true },
      { angle: 65.2 },
      { angle: 102.2 },
      { angle: 138.3 },
      { angle: 173.4 },
    ];

    const referenceProfile = [
      { angle: -149.9, span: 22.9, inner: 84.6, outer: 148.6 },
      { angle: -112.1, span: 23.2, inner: 80.5, outer: 135.0 },
      { angle: -74.9, span: 18.1, inner: 78.0, outer: 113.4 },
      { angle: -39.7, span: 15.6, inner: 76.0, outer: 101.2 },
      { angle: -5.9, span: 13.2, inner: 74.3, outer: 99.5 },
      { angle: 28.5, span: 17.1, inner: 73.9, outer: 109.4 },
      { angle: 65.2, span: 21.6, inner: 75.7, outer: 125.7 },
      { angle: 102.2, span: 22.7, inner: 80.2, outer: 141.7 },
      { angle: 138.3, span: 22.0, inner: 85.8, outer: 152.3 },
      { angle: 173.4, span: 21.7, inner: 87.5, outer: 154.6 },
    ];

    const letterModel = [
      { angle: 145.4, clip: "arqonLetterClipA" },
      { angle: 128.3, clip: "arqonLetterClipR" },
      { angle: 95.7, clip: "arqonLetterClipQ" },
      { angle: 59.5, clip: "arqonLetterClipO" },
      { angle: 38.6, clip: "arqonLetterClipN" },
    ];

    const state = {
      active: false,
      pointerX: window.innerWidth / 2,
      pointerY: window.innerHeight / 2,
      angle: 0,
      distance: 1,
      segmentAngle: 0,
      segmentDistance: 1,
      pupilX: 8,
      pupilY: 0,
      targetPupilX: 8,
      targetPupilY: 0,
    };

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    const mix = (from, to, amount) => from + (to - from) * amount;
    const mixAngle = (from, to, amount) => {
      const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
      return from + delta * amount;
    };
    const toRad = (deg) => (deg * Math.PI) / 180;
    const toDeg = (rad) => (rad * 180) / Math.PI;
    const normalizeDeg = (deg) => ((deg % 360) + 360) % 360;
    const polar = (radius, angle) => ({
      x: mark.cx + Math.cos(angle) * radius,
      y: mark.cy + Math.sin(angle) * radius,
    });
    const angleDelta = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
    const smoothstep = (value) => {
      const x = clamp(value, 0, 1);
      return x * x * (3 - 2 * x);
    };
    const sortedProfile = referenceProfile
      .map((item) => ({ ...item, normalizedAngle: normalizeDeg(item.angle) }))
      .sort((a, b) => a.normalizedAngle - b.normalizedAngle);

    function sampleProfile(relativeAngle) {
      const angle = normalizeDeg(relativeAngle);

      for (let index = 0; index < sortedProfile.length; index += 1) {
        const current = sortedProfile[index];
        const next = sortedProfile[(index + 1) % sortedProfile.length];
        const start = current.normalizedAngle;
        const end = next.normalizedAngle + (next.normalizedAngle <= start ? 360 : 0);
        const target = angle + (angle < start ? 360 : 0);

        if (target >= start && target <= end) {
          const t = end === start ? 0 : (target - start) / (end - start);
          return {
            span: mix(current.span, next.span, t),
            inner: mix(current.inner, next.inner, t),
            outer: mix(current.outer, next.outer, t),
          };
        }
      }

      return sortedProfile[0];
    }

    function segmentPath(angle, span, innerRadius, outerRadius) {
      const half = toRad(span / 2);
      const center = toRad(angle);
      const a0 = center - half;
      const a1 = center + half;
      const p0 = polar(innerRadius, a0);
      const p1 = polar(outerRadius, a0);
      const p2 = polar(outerRadius, a1);
      const p3 = polar(innerRadius, a1);

      return [
        `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)}`,
        `L ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
        `A ${outerRadius.toFixed(2)} ${outerRadius.toFixed(2)} 0 0 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
        `L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
        `A ${innerRadius.toFixed(2)} ${innerRadius.toFixed(2)} 0 0 0 ${p0.x.toFixed(2)} ${p0.y.toFixed(2)}`,
        "Z",
      ].join(" ");
    }

    const segmentNodes = segmentModel.map((segment) => {
      const node = document.createElementNS("http://www.w3.org/2000/svg", "path");
      node.classList.add("arqon-segment");
      if (segment.copper) node.classList.add("is-copper");
      segmentLayer.append(node);
      return { node, segment };
    });

    const letterLights = letterModel.map((letter) => {
      const light = document.createElementNS("http://www.w3.org/2000/svg", "image");
      light.classList.add("arqon-letter-light");
      light.setAttribute("href", logoReference);
      light.setAttributeNS("http://www.w3.org/1999/xlink", "href", logoReference);
      light.setAttribute("x", "0");
      light.setAttribute("y", "0");
      light.setAttribute("width", "1254");
      light.setAttribute("height", "1254");
      light.setAttribute("preserveAspectRatio", "xMidYMid meet");
      light.setAttribute("clip-path", `url(#${letter.clip})`);
      light.style.opacity = "0";
      letterLightLayer.append(light);

      return { angle: toRad(letter.angle), light };
    });

    function updatePointer(event) {
      state.active = true;
      state.pointerX = event.clientX;
      state.pointerY = event.clientY;
    }

    function updateTarget() {
      const rect = demo.getBoundingClientRect();
      const scale = 1254 / rect.width;
      const centerX = rect.left + (mark.cx / 1254) * rect.width;
      const centerY = rect.top + (mark.cy / 1254) * rect.height;

      if (!state.active) {
        state.pointerX = centerX + rect.width * 0.24;
        state.pointerY = centerY;
      }

      const dx = (state.pointerX - centerX) * scale;
      const dy = (state.pointerY - centerY) * scale;
      const angle = Math.atan2(dy, dx);
      const distance = clamp(Math.hypot(dx, dy) / 260, 0, 1);

      state.angle = angle;
      state.distance = distance;
      state.targetPupilX = Math.cos(angle) * distance * 14;
      state.targetPupilY = Math.sin(angle) * distance * 14;
    }

    function drawSegments() {
      segmentNodes.forEach(({ node, segment }) => {
        const profile = sampleProfile(segment.angle - toDeg(state.segmentAngle));
        const neutral = sampleProfile(segment.angle);
        const amount = Math.max(0.16, state.segmentDistance);
        const span = mix(neutral.span, profile.span, amount);
        const inner = mix(neutral.inner, profile.inner, amount);
        const outer = mix(neutral.outer, profile.outer, amount);

        node.setAttribute("d", segmentPath(segment.angle, span, inner, outer));
        node.style.opacity = "0.98";
      });
    }

    function drawLetterGlints() {
      letterLights.forEach((letter) => {
        const closeness = (Math.cos(angleDelta(state.segmentAngle, letter.angle)) + 1) / 2;
        const intensity = smoothstep((closeness - 0.7) / 0.3) * state.segmentDistance;

        letter.light.style.opacity = String((0.78 * intensity).toFixed(3));
      });
    }

    let frameId = null;
    function draw() {
      if (!prefersReducedMotion) {
        updateTarget();
        state.pupilX = mix(state.pupilX, state.targetPupilX, 0.14);
        state.pupilY = mix(state.pupilY, state.targetPupilY, 0.14);
        state.segmentAngle = mixAngle(state.segmentAngle, state.angle, 0.14);
        state.segmentDistance = mix(state.segmentDistance, state.distance, 0.14);
      }

      drawSegments();
      drawLetterGlints();
      pupil.setAttribute("transform", `translate(${state.pupilX.toFixed(2)} ${state.pupilY.toFixed(2)})`);
      frameId = window.requestAnimationFrame(draw);
    }

    const start = () => {
      if (frameId === null) frameId = window.requestAnimationFrame(draw);
    };
    const stop = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
        frameId = null;
      }
    };

    window.addEventListener("pointermove", updatePointer, { passive: true });
    window.addEventListener("pointerdown", updatePointer, { passive: true });
    window.addEventListener("pointerleave", () => {
      state.active = false;
    });
    window.addEventListener("blur", () => {
      state.active = false;
    });

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) start();
          else stop();
        },
        { rootMargin: "12% 0px" },
      );
      observer.observe(demo);
    } else {
      start();
    }
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
  bindArqonEye();
  renderAll();
})();
