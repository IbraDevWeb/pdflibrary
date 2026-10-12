(() => {
  'use strict';

  const DB_NAME = 'folio-library';
  const STORE = 'books';
  const $ = (id) => document.getElementById(id);
  const icon = (name) => '<svg class="icon" aria-hidden="true"><use href="#i-' + name + '"/></svg>';
  const escapeHtml = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const colors = [
    ['#284d48','#17352e'], ['#a66e53','#764b3c'], ['#466a7a','#263e57'],
    ['#7d6587','#4e405d'], ['#9e8260','#6b573b'], ['#5e765a','#374c38'],
    ['#aa6963','#773f48'], ['#3c7171','#244d4e']
  ];
  let db;
  let books = [];
  let view = 'all';
  let layout = localStorage.getItem('folio-layout') === 'list' ? 'list' : 'grid';
  let query = '';
  let editingId = null;
  let editingRating = 0;
  let readingId = null;
  let pdfObjectUrl = null;
  let installPrompt = null;
  let toastTimer;

  function showToast(message, error = false) {
    const t = $('toast');
    t.textContent = message;
    t.className = 'toast show' + (error ? ' error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.className = 'toast', 4500);
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE, { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Une autre fenêtre empêche l’ouverture de la bibliothèque.'));
    });
  }
  function transact(mode, operation) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const store = transaction.objectStore(STORE);
      let result;
      const request = operation(store);
      if (request) {
        request.onsuccess = () => result = request.result;
        request.onerror = () => reject(request.error);
      }
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }
  const getAll = () => transact('readonly', store => store.getAll());
  const putBook = book => transact('readwrite', store => store.put(book));
  const deleteFromDB = id => transact('readwrite', store => store.delete(id));
  const findBook = id => books.find(book => book.id === id);
  const newId = () => crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + '-' + Math.random().toString(36).slice(2);

  async function reload() {
    books = await getAll();
    render();
    updateStorage();
  }

  function bookPalette(book) {
    let sum = 0;
    const title = book.title || '';
    for (let i = 0; i < title.length; i++) sum = (sum * 31 + title.charCodeAt(i)) | 0;
    return colors[Math.abs(sum) % colors.length];
  }
  function coverStyle(book) {
    const c = bookPalette(book);
    return 'background:linear-gradient(145deg,' + c[0] + ',' + c[1] + ')';
  }
  function statusText(status) {
    return status === 'finished' ? 'Terminé' : status === 'reading' ? 'En cours' : 'À lire';
  }
  function ratingStars(rating) {
    const value = Math.max(0, Math.min(5, Number(rating) || 0));
    if (!value) return '<span class="dim">☆☆☆☆☆</span>';
    return '★'.repeat(value) + '<span class="dim">' + '☆'.repeat(5 - value) + '</span>';
  }
  function progress(book) {
    const p = Number(book.page), total = Number(book.totalPages);
    return p > 0 && total > 0 ? Math.min(100, Math.max(0, Math.round(p / total * 100))) : 0;
  }
  function card(book) {
    const id = escapeHtml(book.id);
    return '<article class="book-card">' +
      '<button class="cover-button" data-action="read" data-id="' + id + '" aria-label="Lire ' + escapeHtml(book.title) + '">' +
      '<div class="book-cover" style="' + coverStyle(book) + '"><div class="cover-inner">' +
      '<span class="cover-small">FOLIO · BIBLIOTHÈQUE</span><span class="cover-line"></span><span class="cover-title">' + escapeHtml(book.title) + '</span>' +
      '<span class="cover-line"></span><span class="cover-author">' + escapeHtml(book.author || 'VOTRE COLLECTION') + '</span></div></div></button>' +
      '<button class="book-fav' + (book.favorite ? ' active' : '') + '" data-action="favorite" data-id="' + id + '" aria-label="' + (book.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris') + '" title="Favoris">' + icon('heart') + '</button>' +
      '<div class="book-data"><span class="book-category">' + escapeHtml(book.category || 'Non classé') + '</span>' +
      '<button class="book-title-link" data-action="edit" data-id="' + id + '" title="Modifier ce livre"><span class="book-title">' + escapeHtml(book.title) + '</span></button>' +
      '<p class="book-author">' + escapeHtml(book.author || 'Auteur inconnu') + '</p>' +
      '<div class="book-meta"><span class="status ' + escapeHtml(book.status || 'to-read') + '">' + statusText(book.status) + '</span><span class="rating-display" aria-label="Note ' + (Number(book.rating) || 0) + ' sur 5">' + ratingStars(book.rating) + '</span></div></div></article>';
  }
  function filteredBooks() {
    let result = books.filter(book => {
      if (view === 'favorites' && !book.favorite) return false;
      if (view === 'reading' && book.status !== 'reading') return false;
      if (view === 'finished' && book.status !== 'finished') return false;
      if (view.startsWith('category:') && book.category !== view.slice(9)) return false;
      const text = [book.title, book.author, book.category, (book.tags || []).join(' '), book.notes].join(' ').toLocaleLowerCase();
      return text.includes(query.toLocaleLowerCase());
    });
    const sort = $('sortSelect').value;
    result.sort((a, b) => {
      if (sort === 'title') return (a.title || '').localeCompare(b.title || '', 'fr');
      if (sort === 'author') return (a.author || '').localeCompare(b.author || '', 'fr');
      if (sort === 'rating') return (Number(b.rating) || 0) - (Number(a.rating) || 0) || (b.createdAt || 0) - (a.createdAt || 0);
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    return result;
  }
  function render() {
    const reading = books.filter(b => b.status === 'reading');
    const finished = books.filter(b => b.status === 'finished');
    const favorites = books.filter(b => b.favorite);
    $('statAll').textContent = $('count-all').textContent = books.length;
    $('statReading').textContent = $('count-reading').textContent = reading.length;
    $('statFinished').textContent = $('count-finished').textContent = finished.length;
    $('statFavorites').textContent = $('count-favorites').textContent = favorites.length;

    const categories = [...new Set(books.map(b => (b.category || '').trim()).filter(Boolean))].sort((a,b) => a.localeCompare(b, 'fr'));
    $('collectionNav').innerHTML = categories.map(category => {
      const value = 'category:' + category;
      const count = books.filter(b => b.category === category).length;
      return '<button class="nav-link' + (view === value ? ' active' : '') + '" data-view="' + escapeHtml(value) + '"><span class="collection-dot"></span>' + escapeHtml(category) + '<span class="nav-count">' + count + '</span></button>';
    }).join('');
    $('categorySuggestions').innerHTML = categories.map(c => '<option value="' + escapeHtml(c) + '"></option>').join('');

    document.querySelectorAll('[data-view]').forEach(button => {
      const active = button.dataset.view === view;
      button.classList.toggle('active', active);
      if (button.matches('.mobile-nav button')) button.setAttribute('aria-current', active ? 'page' : 'false');
    });
    document.querySelectorAll('[data-layout]').forEach(button => button.classList.toggle('active', button.dataset.layout === layout));

    const title = view === 'favorites' ? 'Mes favoris' : view === 'reading' ? 'Lectures en cours' : view === 'finished' ? 'Livres terminés' : view.startsWith('category:') ? view.slice(9) : 'Tous mes livres';
    $('sectionTitle').childNodes[0].textContent = title + ' ';
    const shown = filteredBooks();
    $('resultCount').textContent = shown.length;
    $('booksGrid').className = 'books-grid' + (layout === 'list' ? ' list-layout' : '');
    $('booksGrid').innerHTML = shown.map(card).join('');
    $('emptyState').hidden = shown.length !== 0;
    $('emptyTitle').textContent = books.length === 0 ? 'Votre bibliothèque vous attend' : 'Aucun livre trouvé';
    $('emptyDescription').textContent = books.length === 0 ? 'Ajoutez votre premier livre PDF pour commencer votre collection.' : 'Essayez une autre recherche ou sélectionnez une autre collection.';
    $('emptyAction').hidden = books.length !== 0;

    const recent = books.filter(b => b.lastReadAt && b.status === 'reading').sort((a,b) => b.lastReadAt - a.lastReadAt)[0];
    $('resumeSection').hidden = !recent;
    if (recent) {
      $('resumeContent').innerHTML = '<div class="resume-content"><div class="resume-cover" style="' + coverStyle(recent) + '"></div><div class="resume-detail"><strong>' + escapeHtml(recent.title) + '</strong><span>' + escapeHtml(recent.author || 'Auteur inconnu') + (recent.page ? ' · Page ' + recent.page : '') + '</span><div class="resume-progress"><span style="width:' + progress(recent) + '%"></span></div></div><button class="button button-primary resume-button" data-action="read" data-id="' + escapeHtml(recent.id) + '">Continuer ' + icon('arrow') + '</button></div>';
    }
  }

  async function verifyPDF(blob) {
    if (!blob || blob.size === 0) return false;
    const header = await blob.slice(0, 1024).text();
    return header.includes('%PDF-');
  }
  function safeFilename(title) {
    return String(title || 'livre').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 120) + '.pdf';
  }
  async function importPDF(file) {
    if (!(await verifyPDF(file))) throw new Error((file.name || 'Le fichier') + " n'est pas un PDF valide.");
    const title = (file.name || 'Livre PDF').replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Livre PDF';
    if (books.some(b => b.title === title && b.file && b.file.size === file.size)) return false;
    const now = Date.now();
    const book = { id:newId(), title, author:'', category:'', tags:[], rating:0, favorite:false, status:'to-read', notes:'', page:1, totalPages:null, createdAt:now, updatedAt:now, lastReadAt:null, file };
    await putBook(book);
    books.push(book);
    return book;
  }
  async function importFiles(fileList) {
    const files = Array.from(fileList);
    if (!files.length) return;
    let imported = 0, skipped = 0, errors = [];
    for (const file of files) {
      try {
        const result = await importPDF(file);
        if (result) imported++; else skipped++;
      } catch (error) { errors.push(error.message || String(error)); }
    }
    $('importDialog').close();
    await reload();
    if (errors.length) showToast(errors[0] + (errors.length > 1 ? ' (' + errors.length + ' erreurs)' : ''), true);
    else showToast(imported + ' livre(s) ajouté(s)' + (skipped ? ' · ' + skipped + ' déjà présent(s)' : '') + '.');
    if (imported) navigator.storage?.persist?.().catch(() => {});
  }

  function openImport() {
    if (!db) { showToast('Le stockage local est indisponible.', true); return; }
    $('importDialog').showModal();
  }
  function openEdit(id) {
    const book = findBook(id);
    if (!book) return;
    editingId = id;
    editingRating = Number(book.rating) || 0;
    $('editTitle').value = book.title || '';
    $('editAuthor').value = book.author || '';
    $('editCategory').value = book.category || '';
    $('editStatus').value = book.status || 'to-read';
    $('editTags').value = (book.tags || []).join(', ');
    $('editNotes').value = book.notes || '';
    $('editPage').value = book.page || '';
    $('editTotal').value = book.totalPages || '';
    drawRating();
    $('editDialog').showModal();
  }
  function drawRating() {
    $('editRating').innerHTML = [1,2,3,4,5].map(n => '<button type="button" data-rate="' + n + '" class="' + (n <= editingRating ? 'selected' : '') + '" aria-label="' + n + ' étoile(s)" aria-pressed="' + (n === editingRating) + '">' + icon('star') + '</button>').join('') +
      '<button type="button" data-rate="0" class="reset-rating" aria-label="Effacer la note">Effacer</button>';
  }
  async function saveEdit(event) {
    event.preventDefault();
    const book = findBook(editingId);
    if (!book) return;
    const title = $('editTitle').value.trim();
    if (!title) { $('editTitle').focus(); return; }
    const total = Math.max(1, Math.floor(Number($('editTotal').value))) || null;
    const page = Math.max(1, Math.floor(Number($('editPage').value))) || 1;
    Object.assign(book, {
      title, author:$('editAuthor').value.trim(), category:$('editCategory').value.trim(),
      status:$('editStatus').value, tags:$('editTags').value.split(',').map(s => s.trim()).filter(Boolean).slice(0,30),
      rating:editingRating, notes:$('editNotes').value, page:total ? Math.min(page,total) : page,
      totalPages:total, updatedAt:Date.now()
    });
    try {
      await putBook(book);
      $('editDialog').close();
      if (readingId === book.id) {
        $('readerTitle').textContent = book.title;
        $('readerAuthor').textContent = book.author || 'Auteur inconnu';
        $('readerPage').value = book.page;
        $('readerTotal').textContent = book.totalPages ? '/ ' + book.totalPages : '';
      }
      render();
      showToast('Fiche du livre enregistrée.');
    } catch (error) { showToast('Impossible de sauvegarder ce livre : ' + error.message, true); }
  }
  async function removeBook() {
    const book = findBook(editingId);
    if (!book || !confirm('Supprimer définitivement « ' + book.title + ' » de cet appareil ?')) return;
    try {
      if (readingId === book.id) closeReader();
      await deleteFromDB(book.id);
      $('editDialog').close();
      await reload();
      showToast('Livre supprimé.');
    } catch (error) { showToast('Suppression impossible : ' + error.message, true); }
  }
  async function toggleFavorite(id) {
    const book = findBook(id);
    if (!book) return;
    book.favorite = !book.favorite;
    book.updatedAt = Date.now();
    try { await putBook(book); render(); } catch (e) { book.favorite = !book.favorite; showToast('Erreur de sauvegarde.', true); }
  }
  async function openReader(id) {
    const book = findBook(id);
    if (!book || !book.file) { showToast('Fichier PDF introuvable.', true); return; }
    closeReader();
    readingId = id;
    book.lastReadAt = Date.now();
    if (book.status === 'to-read') book.status = 'reading';
    try { await putBook(book); } catch (e) { showToast('Progression non enregistrée.', true); }
    pdfObjectUrl = URL.createObjectURL(book.file);
    $('readerTitle').textContent = book.title;
    $('readerAuthor').textContent = book.author || 'Auteur inconnu';
    $('readerPage').value = book.page || 1;
    $('readerTotal').textContent = book.totalPages ? '/ ' + book.totalPages : '';
    $('readerFrame').src = pdfObjectUrl + '#page=' + (book.page || 1);
    $('reader').hidden = false;
    document.body.style.overflow = 'hidden';
    render();
  }
  function closeReader() {
    $('reader').hidden = true;
    $('readerFrame').removeAttribute('src');
    document.body.style.overflow = '';
    if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl);
    pdfObjectUrl = null;
    readingId = null;
  }
  async function changePage() {
    const book = findBook(readingId);
    if (!book) return;
    let page = Math.max(1, Math.floor(Number($('readerPage').value)) || 1);
    if (book.totalPages) page = Math.min(page, book.totalPages);
    $('readerPage').value = page;
    book.page = page;
    book.updatedAt = Date.now();
    try {
      await putBook(book);
      if (pdfObjectUrl) $('readerFrame').src = pdfObjectUrl + '#page=' + page;
      render();
    } catch (e) { showToast('Page non enregistrée.', true); }
  }
  function downloadBook(id) {
    const book = findBook(id);
    if (!book || !book.file) return;
    const url = URL.createObjectURL(book.file);
    const a = document.createElement('a');
    a.href = url; a.download = safeFilename(book.title);
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  async function updateStorage() {
    try {
      const e = await navigator.storage.estimate();
      if (e && e.usage != null && e.quota) {
        const format = n => n > 1073741824 ? (n / 1073741824).toFixed(1) + ' Go' : (n / 1048576).toFixed(1) + ' Mo';
        $('storageInfo').textContent = format(e.usage) + ' utilisés sur ' + format(e.quota) + ' disponibles (estimation du navigateur).';
      } else $('storageInfo').textContent = 'Votre bibliothèque est stockée sur cet appareil.';
      if (navigator.storage.persisted) {
        const persisted = await navigator.storage.persisted();
        $('persistStorage').textContent = persisted ? 'Stockage persistant activé ✓' : 'Protéger le stockage de mon appareil';
      }
    } catch (e) { $('storageInfo').textContent = 'Estimation indisponible.'; }
  }
  async function requestPersistence() {
    if (!navigator.storage.persist) { showToast('Non pris en charge sur ce navigateur.', true); return; }
    const approved = await navigator.storage.persist();
    showToast(approved ? 'Stockage persistant activé.' : "Le navigateur n'a pas accordé le stockage persistant.");
    updateStorage();
  }

  // Sauvegardes ZIP autonomes, sans dépendance ni serveur. Entrées ZIP non compressées (méthode STORE).
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const crcTable = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  function set16(v, offset, n) { v.setUint16(offset, n, true); }
  function set32(v, offset, n) { v.setUint32(offset, n >>> 0, true); }
  async function checksum(blob) {
    let crc = 0xffffffff;
    for (let start = 0; start < blob.size; start += 1048576) {
      const buffer = new Uint8Array(await blob.slice(start, start + 1048576).arrayBuffer());
      for (const byte of buffer) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }
  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  async function exportBackup() {
    const button = $('backupExport');
    if (!books.length) { showToast('Ajoutez au moins un livre avant de sauvegarder.', true); return; }
    button.disabled = true; button.textContent = 'Création de la sauvegarde...';
    try {
      const metadata = books.map(book => {
        const { file, ...rest } = book;
        return { ...rest, filePath:'books/' + book.id + '.pdf' };
      });
      const entries = [{ name:'library.json', file:new Blob([JSON.stringify({ format:'folio-backup', version:1, books:metadata })], {type:'application/json'}) }];
      for (const book of books) entries.push({ name:'books/' + book.id + '.pdf', file:book.file });
      if (entries.length > 65535) throw new Error('Trop de fichiers.');
      const parts = [], central = [];
      let offset = 0, centralSize = 0;
      for (const entry of entries) {
        const name = encoder.encode(entry.name);
        if (name.length > 65535 || entry.file.size > 0xffffffff || offset > 0xffffffff) throw new Error('Sauvegarde trop volumineuse pour ce format ZIP.');
        const size = entry.file.size, crc = await checksum(entry.file);
        const local = new Uint8Array(30 + name.length), l = new DataView(local.buffer);
        set32(l,0,0x04034b50); set16(l,4,20); set16(l,6,0x0800); set16(l,8,0);
        set32(l,14,crc); set32(l,18,size); set32(l,22,size); set16(l,26,name.length);
        local.set(name,30);
        const cd = new Uint8Array(46 + name.length), c = new DataView(cd.buffer);
        set32(c,0,0x02014b50); set16(c,4,20); set16(c,6,20); set16(c,8,0x0800); set16(c,10,0);
        set32(c,16,crc); set32(c,20,size); set32(c,24,size); set16(c,28,name.length); set32(c,42,offset);
        cd.set(name,46);
        parts.push(local, entry.file);
        central.push(cd);
        centralSize += cd.length;
        offset += local.length + size;
      }
      if (offset + centralSize > 0xffffffff) throw new Error('Sauvegarde supérieure à 4 Go non prise en charge.');
      const end = new Uint8Array(22), ev = new DataView(end.buffer);
      set32(ev,0,0x06054b50); set16(ev,8,entries.length); set16(ev,10,entries.length);
      set32(ev,12,centralSize); set32(ev,16,offset);
      triggerDownload(new Blob([...parts,...central,end],{type:'application/zip'}), 'folio-sauvegarde-' + new Date().toISOString().slice(0,10) + '.zip');
      showToast('Sauvegarde ZIP créée : conservez-la en lieu sûr.');
    } catch (e) { showToast('Échec de la sauvegarde : ' + e.message, true); }
    finally { button.disabled = false; button.textContent = 'Exporter ma bibliothèque (.zip)'; }
  }
  async function readBackupZip(file) {
    const tailStart = Math.max(0, file.size - 65557);
    const tail = new DataView(await file.slice(tailStart).arrayBuffer());
    let end = -1;
    for (let i = tail.byteLength - 22; i >= 0; i--) {
      if (tail.getUint32(i,true) === 0x06054b50) { end = i; break; }
    }
    if (end < 0) throw new Error('Archive ZIP invalide.');
    const count = tail.getUint16(end + 10,true);
    const centralSize = tail.getUint32(end + 12,true), centralOffset = tail.getUint32(end + 16,true);
    if (count > 10000 || centralSize > 50000000 || centralOffset + centralSize > file.size) throw new Error('Archive ZIP non prise en charge.');
    const central = new DataView(await file.slice(centralOffset,centralOffset + centralSize).arrayBuffer());
    let cursor = 0;
    const entries = new Map();
    for (let i = 0; i < count; i++) {
      if (cursor + 46 > central.byteLength || central.getUint32(cursor,true) !== 0x02014b50) throw new Error('Table ZIP invalide.');
      const method = central.getUint16(cursor + 10,true);
      const size = central.getUint32(cursor + 20,true);
      const nameLength = central.getUint16(cursor + 28,true), extraLength = central.getUint16(cursor + 30,true), commentLength = central.getUint16(cursor + 32,true);
      const localOffset = central.getUint32(cursor + 42,true);
      if (cursor + 46 + nameLength + extraLength + commentLength > central.byteLength) throw new Error('Entrée ZIP invalide.');
      const nameBytes = new Uint8Array(central.buffer,central.byteOffset + cursor + 46,nameLength);
      const name = decoder.decode(nameBytes);
      if (method !== 0) throw new Error('Archive compressée non prise en charge. Importez une sauvegarde Folio.');
      const header = new DataView(await file.slice(localOffset,localOffset + 30).arrayBuffer());
      if (header.byteLength !== 30 || header.getUint32(0,true) !== 0x04034b50) throw new Error('Fichier ZIP invalide.');
      const start = localOffset + 30 + header.getUint16(26,true) + header.getUint16(28,true);
      if (start + size > file.size) throw new Error('Fichier ZIP tronqué.');
      if (entries.has(name)) throw new Error('Doublon dans le fichier ZIP.');
      entries.set(name,file.slice(start,start + size));
      cursor += 46 + nameLength + extraLength + commentLength;
    }
    return entries;
  }
  async function restoreBackup(file) {
    try {
      const entries = await readBackupZip(file);
      const manifest = entries.get('library.json');
      if (!manifest || manifest.size > 10000000) throw new Error('Manifest de sauvegarde introuvable.');
      const data = JSON.parse(await manifest.text());
      if (data.format !== 'folio-backup' || data.version !== 1 || !Array.isArray(data.books)) throw new Error('Sauvegarde Folio incompatible.');
      let added = 0, skipped = 0;
      for (const info of data.books) {
        if (!info || typeof info.id !== 'string' || !/^[\w-]{1,100}$/.test(info.id) || typeof info.title !== 'string' || info.title.length > 200) throw new Error('Données de livre invalides.');
        if (books.some(b => b.id === info.id)) { skipped++; continue; }
        const expected = 'books/' + info.id + '.pdf';
        if (info.filePath !== expected || !entries.has(expected)) throw new Error('PDF manquant : ' + info.title);
        const fileBlob = entries.get(expected);
        if (!(await verifyPDF(fileBlob))) throw new Error('PDF invalide : ' + info.title);
        const now = Date.now();
        const book = {
          id:info.id, title:info.title, author:String(info.author || '').slice(0,150),
          category:String(info.category || '').slice(0,65),
          tags:Array.isArray(info.tags) ? info.tags.slice(0,30).map(v => String(v).slice(0,80)) : [],
          rating:Number.isInteger(info.rating) ? Math.min(5,Math.max(0,info.rating)) : 0,
          favorite:info.favorite === true,
          status:['to-read','reading','finished'].includes(info.status) ? info.status : 'to-read',
          notes:String(info.notes || '').slice(0,20000),
          page:Math.max(1,Math.floor(Number(info.page) || 1)),
          totalPages:Number(info.totalPages) > 0 ? Math.floor(Number(info.totalPages)) : null,
          createdAt:Number(info.createdAt) || now, updatedAt:now,
          lastReadAt:Number(info.lastReadAt) || null, file:fileBlob
        };
        await putBook(book);
        books.push(book);
        added++;
      }
      await reload();
      $('settingsDialog').close();
      showToast(added + ' livre(s) restauré(s)' + (skipped ? ' · ' + skipped + ' déjà présent(s)' : '') + '.');
    } catch (e) { showToast('Restauration impossible : ' + e.message, true); }
  }

  function setImportTab(tab) {
    const url = tab === 'url';
    $('filePanel').hidden = url;
    $('urlForm').hidden = !url;
    $('fileTab').classList.toggle('active', !url);
    $('urlTab').classList.toggle('active', url);
  }
  async function importURL(event) {
    event.preventDefault();
    const url = $('pdfUrl').value.trim();
    const submit = $('urlForm').querySelector('button[type="submit"]');
    if (!/^https?:\/\//i.test(url)) { showToast('Utilisez un lien HTTPS valide.', true); return; }
    submit.disabled = true; submit.textContent = 'Téléchargement en cours...';
    try {
      const response = await fetch(url, { mode:'cors' });
      if (!response.ok) throw new Error('Erreur HTTP ' + response.status);
      const blob = await response.blob();
      if (!(await verifyPDF(blob))) throw new Error('Le lien ne renvoie pas un document PDF.');
      const raw = decodeURIComponent(new URL(url).pathname.split('/').pop() || 'Livre PDF');
      const filename = /\.pdf$/i.test(raw) ? raw : raw + '.pdf';
      const file = new File([blob],filename,{type:'application/pdf'});
      await importFiles([file]);
      $('pdfUrl').value = '';
    } catch (e) {
      showToast('Import impossible. Vérifiez le lien et les autorisations CORS. ' + e.message, true);
    } finally {
      submit.disabled = false; submit.textContent = 'Importer ce PDF';
    }
  }

  function setupEvents() {
    document.addEventListener('click', event => {
      const importButton = event.target.closest('[data-open-import]');
      if (importButton) { openImport(); return; }
      const viewButton = event.target.closest('[data-view]');
      if (viewButton) { view = viewButton.dataset.view; query = ''; $('searchInput').value = ''; render(); window.scrollTo({top:0,behavior:'smooth'}); return; }
      const layoutButton = event.target.closest('[data-layout]');
      if (layoutButton) { layout = layoutButton.dataset.layout; localStorage.setItem('folio-layout',layout); render(); return; }
      const tab = event.target.closest('[data-import-tab]');
      if (tab) { setImportTab(tab.dataset.importTab); return; }
      const ratingButton = event.target.closest('[data-rate]');
      if (ratingButton) { editingRating = Number(ratingButton.dataset.rate); drawRating(); return; }
      const action = event.target.closest('[data-action]');
      if (action) {
        const id = action.dataset.id;
        if (action.dataset.action === 'read') openReader(id);
        if (action.dataset.action === 'edit') openEdit(id);
        if (action.dataset.action === 'favorite') toggleFavorite(id);
        return;
      }
      if (event.target.closest('.close-dialog')) event.target.closest('dialog').close();
    });
    document.querySelectorAll('dialog').forEach(dialog => {
      dialog.addEventListener('click', event => {
        if (event.target === dialog) dialog.close();
      });
    });
    $('searchInput').addEventListener('input', event => { query = event.target.value.trim(); render(); });
    $('sortSelect').addEventListener('change', render);
    $('pdfFiles').addEventListener('change', event => { importFiles(event.target.files); event.target.value = ''; });
    const drop = $('dropZone');
    drop.addEventListener('dragover', event => { event.preventDefault(); drop.classList.add('dragover'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
    drop.addEventListener('drop', event => { event.preventDefault(); drop.classList.remove('dragover'); importFiles(event.dataTransfer.files); });
    $('urlForm').addEventListener('submit', importURL);
    $('editForm').addEventListener('submit', saveEdit);
    $('deleteBook').addEventListener('click', removeBook);
    $('closeReader').addEventListener('click', closeReader);
    $('readerPage').addEventListener('change', changePage);
    $('readerEdit').addEventListener('click', () => openEdit(readingId));
    $('readerDownload').addEventListener('click', () => downloadBook(readingId));
    $('openExternal').addEventListener('click', () => { if (pdfObjectUrl) window.open(pdfObjectUrl, '_blank'); });
    $('settingsTop').addEventListener('click', () => { updateStorage(); $('settingsDialog').showModal(); });
    $('settingsSide').addEventListener('click', () => { updateStorage(); $('settingsDialog').showModal(); });
    $('persistStorage').addEventListener('click', requestPersistence);
    $('backupExport').addEventListener('click', exportBackup);
    $('backupImport').addEventListener('change', event => { if (event.target.files[0]) restoreBackup(event.target.files[0]); event.target.value = ''; });
    $('installApp').addEventListener('click', async () => {
      if (installPrompt) {
        const p = installPrompt;
        installPrompt = null;
        await p.prompt();
      } else if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
        alert('Sur iPhone : ouvrez cette page dans Safari, touchez Partager, puis « Sur l’écran d’accueil ».');
      } else {
        alert('Dans le menu de votre navigateur, choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil ». Le site doit être servi en HTTPS.');
      }
    });
    window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; });
    window.addEventListener('appinstalled', () => { installPrompt = null; showToast('Folio est installé sur votre appareil.'); });
    document.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); $('searchInput').focus(); }
      if (event.key === 'Escape' && !$('reader').hidden && !document.querySelector('dialog[open]')) closeReader();
    });
  }

  async function start() {
    setupEvents();
    try { db = await openDatabase(); await reload(); }
    catch (error) {
      showToast('Stockage indisponible. Autorisez les données du site dans votre navigateur. ' + error.message,true);
      $('emptyTitle').textContent = 'Stockage indisponible';
      $('emptyDescription').textContent = 'Cette application a besoin du stockage local du navigateur pour conserver vos PDF.';
      $('emptyState').hidden = false;
    }
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
    }
  }
  start();
})();