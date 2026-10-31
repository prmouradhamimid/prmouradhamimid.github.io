'use strict';

(() => {
  const data = window.scholarData;
  const translations = window.translations;
  const pages = ['home', 'about', 'research', 'publications', 'teaching', 'contact'];
  const search = document.getElementById('publication-search');
  const year = document.getElementById('publication-year');
  const type = document.getElementById('publication-type');
  const sort = document.getElementById('publication-sort');
  const menu = document.querySelector('.menu-toggle');
  const nav = document.getElementById('main-nav');
  let language = 'en';
  let currentPage = null;
  let filteredPublications = [];

  function t(key) {
    return translations[language][key] ?? translations.en[key] ?? key;
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function number(value) {
    return new Intl.NumberFormat(language).format(value);
  }

  function formatYear(value) {
    return new Intl.NumberFormat(language, { useGrouping: false }).format(value);
  }

  function scholarLink(paper) {
    return 'https://scholar.google.com/scholar?q=' + encodeURIComponent('"' + paper.title + '"');
  }

  function externalLink(paper, text, className) {
    const link = element('a', className, text);
    link.href = scholarLink(paper);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    return link;
  }

  function renderMetrics() {
    const metrics = [
      { label: 'citations', value: data.metrics.citations, recent: data.metrics.recentCitations, icon: '↗' },
      { label: 'hIndex', value: data.metrics.hIndex, recent: data.metrics.recentHIndex, icon: 'h' },
      { label: 'i10Index', value: data.metrics.i10Index, recent: data.metrics.recentI10Index, icon: 'i₁₀' },
      { label: 'publications', value: data.publications.length, icon: '▤' }
    ];
    document.querySelectorAll('[data-metrics]').forEach(container => {
      const fragment = document.createDocumentFragment();
      metrics.forEach(metric => {
        const card = element('div', 'metric');
        const top = element('div', 'metric-top');
        const icon = element('span', 'metric-icon', metric.icon);
        icon.setAttribute('aria-hidden', 'true');
        top.append(element('strong', 'metric-value', number(metric.value)), icon);
        const detail = metric.recent === undefined ? '2009–2025' : `${t('allTime')} · ${number(metric.recent)} ${t('since2021')}`;
        card.append(top, element('span', 'metric-label', t(metric.label)), element('span', 'metric-detail', detail));
        fragment.append(card);
      });
      container.replaceChildren(fragment);
    });
  }

  function renderSelected() {
    const container = document.getElementById('selected-publications');
    const selected = [...data.publications].sort((a, b) => (b.citations ?? -1) - (a.citations ?? -1)).slice(0, 3);
    const fragment = document.createDocumentFragment();
    selected.forEach(paper => {
      const card = element('article', 'selected-card');
      const meta = element('div', 'publication-meta');
      meta.append(element('span', 'type-badge', t(paper.type)), element('span', '', formatYear(paper.year)));
      const heading = element('h3');
      heading.lang = 'en';
      heading.dir = 'ltr';
      heading.append(externalLink(paper, paper.title));
      const venue = element('p', 'venue', paper.venue);
      venue.dir = 'ltr';
      venue.lang = 'en';
      const bottom = element('div', 'selected-bottom');
      const citations = element('span');
      citations.append(element('strong', '', number(paper.citations)), document.createTextNode(' ' + t('citations')));
      bottom.append(citations, externalLink(paper, t('findPaper') + ' ↗', 'text-link'));
      card.append(meta, heading, venue, bottom);
      fragment.append(card);
    });
    container.replaceChildren(fragment);
  }

  function normalise(text) {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  function getFilteredPublications() {
    const terms = normalise(search.value.trim()).split(/\s+/).filter(Boolean);
    return data.publications.filter(paper => {
      const content = normalise(`${paper.title} ${paper.authors} ${paper.venue} ${paper.year}`);
      return terms.every(term => content.includes(term)) &&
        (!year.value || paper.year === Number(year.value)) &&
        (!type.value || paper.type === type.value);
    }).sort((a, b) => {
      if (sort.value === 'cited') return (b.citations ?? -1) - (a.citations ?? -1) || b.year - a.year;
      if (sort.value === 'oldest') return a.year - b.year || a.title.localeCompare(b.title);
      return b.year - a.year || (b.citations ?? -1) - (a.citations ?? -1);
    });
  }

  function renderPublications() {
    filteredPublications = getFilteredPublications();
    const fragment = document.createDocumentFragment();
    filteredPublications.forEach(paper => {
      const row = element('article', 'publication-row');
      const content = element('div', 'publication-content');
      content.lang = paper.type === 'thesis' ? 'fr' : 'en';
      const badge = element('span', 'type-badge', t(paper.type));
      badge.lang = language;
      const heading = element('h2', 'publication-title');
      heading.lang = paper.type === 'thesis' ? 'fr' : 'en';
      heading.append(externalLink(paper, paper.title));
      const actions = element('div', 'publication-actions');
      actions.lang = language;
      const cite = element('button', '', t('cite'));
      cite.type = 'button';
      cite.setAttribute('aria-label', `${t('cite')}: ${paper.title}`);
      cite.addEventListener('click', () => downloadBibTeX([paper], paper.id + '.bib'));
      actions.append(externalLink(paper, t('findPaper') + ' ↗', 'text-link'), cite);
      content.append(badge, heading, element('p', 'authors', paper.authors), element('p', 'venue', paper.venue), actions);
      const count = element('div', 'citation-count');
      if (paper.citations === null) {
        count.append(element('strong', '', '—'), element('span', 'not-reported', t('unreported')));
      } else {
        count.append(element('strong', '', number(paper.citations)), element('span', '', t('citations')));
      }
      row.append(element('div', 'publication-year', formatYear(paper.year)), content, count);
      fragment.append(row);
    });
    document.getElementById('publication-list').replaceChildren(fragment);
    document.getElementById('results-count').textContent = `${number(filteredPublications.length)} / ${number(data.publications.length)} ${t('results')}`;
    document.getElementById('empty-state').hidden = filteredPublications.length > 0;
    document.getElementById('export-bib').disabled = filteredPublications.length === 0;
  }

  // Export only fields provided by the source, not inferred DOIs or issue metadata.
  function bibEscape(value) {
    const replacements = { '\\': '{\\textbackslash}', '{': '\\{', '}': '\\}', '&': '\\&', '%': '\\%', '_': '\\_', '#': '\\#', '$': '\\$', '~': '{\\textasciitilde}', '^': '{\\textasciicircum}' };
    return value.replace(/[\\{}&%_#$~^]/g, character => replacements[character]);
  }

  function toBibTeX(paper) {
    const entryType = { journal: 'article', conference: 'inproceedings', thesis: 'phdthesis', preprint: 'misc' }[paper.type];
    const venueKey = { journal: 'journal', conference: 'booktitle', thesis: 'school', preprint: 'note' }[paper.type];
    const fields = [
      ['title', '{' + bibEscape(paper.title) + '}'],
      ['author', paper.authors.split(', ').map(author => bibEscape(author)).join(' and ')],
      ['year', String(paper.year)],
      ['url', scholarLink(paper)]
    ];
    if (paper.bib) {
      Object.entries(paper.bib).forEach(([key, value]) => fields.push([key, bibEscape(value)]));
    } else {
      fields.push([venueKey, bibEscape(paper.venue)]);
    }
    return `@${entryType}{${paper.id},\n${fields.map(([key, value]) => `  ${key} = {${value}}`).join(',\n')}\n}`;
  }

  function downloadBibTeX(papers, filename) {
    if (!papers.length) return;
    const blob = new Blob([papers.map(toBibTeX).join('\n\n') + '\n'], { type: 'application/x-bibtex;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function resetFilters() {
    search.value = '';
    year.value = '';
    type.value = '';
    sort.value = 'newest';
    renderPublications();
  }

  function setMenu(open) {
    nav.classList.toggle('open', open);
    menu.setAttribute('aria-expanded', String(open));
    menu.textContent = t(open ? 'closeMenu' : 'menu');
  }

  function setLanguage(value) {
    language = Object.hasOwn(translations, value) ? value : 'en';
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-i18n]').forEach(node => {
      node.textContent = t(node.dataset.i18n);
    });
    document.querySelectorAll('[data-placeholder]').forEach(node => {
      node.placeholder = t(node.dataset.placeholder);
    });
    document.querySelectorAll('[data-language]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.language === language));
    });
    document.querySelector('.languages').setAttribute('aria-label', t('languageLabel'));
    nav.setAttribute('aria-label', t('quickLinks'));
    renderMetrics();
    renderSelected();
    renderPublications();
    setMenu(false);
    updateTitle();
    try { localStorage.setItem('preferredLanguage', language); } catch { /* Private browsing may disable storage. */ }
  }

  function updateTitle() {
    const keys = { home: 'navHome', about: 'navAbout', research: 'navResearch', publications: 'navPublications', teaching: 'navTeaching', contact: 'navContact' };
    document.title = `Mourad Hamimid | ${t(keys[currentPage ?? 'home'])}`;
  }

  function showPage(focusHeading) {
    const requested = location.hash.slice(1);
    const target = pages.includes(requested) ? requested : 'home';
    if (requested && !pages.includes(requested) && requested !== 'main') {
      history.replaceState(null, '', '#home');
    }
    // The skip link uses a real landmark, rather than switching to another page.
    if (requested === 'main' && currentPage) return;
    document.querySelectorAll('.page').forEach(page => { page.hidden = page.id !== target; });
    document.querySelectorAll('nav [data-page]').forEach(link => {
      if (link.dataset.page === target) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    const changed = currentPage !== target;
    currentPage = target;
    setMenu(false);
    updateTitle();
    if (focusHeading && changed) {
      document.querySelector(`#${target} h1`).focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  [...new Set(data.publications.map(paper => paper.year))].sort((a, b) => b - a).forEach(value => {
    const option = element('option', '', String(value));
    option.value = String(value);
    year.append(option);
  });
  search.addEventListener('input', renderPublications);
  [year, type, sort].forEach(control => control.addEventListener('change', renderPublications));
  document.getElementById('reset-filters').addEventListener('click', resetFilters);
  document.getElementById('empty-reset').addEventListener('click', () => { resetFilters(); search.focus(); });
  document.getElementById('export-bib').addEventListener('click', () => downloadBibTeX(filteredPublications, 'mourad-hamimid-publications.bib'));
  menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', event => {
    if (event.target.closest('a')) setMenu(false);
  });
  document.querySelector('.skip-link').addEventListener('click', event => {
    event.preventDefault();
    setMenu(false);
    document.getElementById('main').focus();
    document.getElementById('main').scrollIntoView();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      menu.focus();
    }
  });
  document.querySelectorAll('[data-language]').forEach(button => button.addEventListener('click', () => setLanguage(button.dataset.language)));
  window.addEventListener('hashchange', () => showPage(true));
  document.getElementById('year').textContent = String(new Date().getFullYear());
  let savedLanguage = 'en';
  try { savedLanguage = localStorage.getItem('preferredLanguage') || 'en'; } catch { /* Use English when storage is unavailable. */ }
  setLanguage(savedLanguage);
  showPage(false);
})();
