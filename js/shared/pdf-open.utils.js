/* js/shared/pdf-open.utils.js — лёгкое открытие PDF без all-pages canvas (OOM-safe) */
(function () {
    'use strict';

    if (typeof window === 'undefined') return;

    var MODAL_ID = 'rbi-pdf-open-sheet';

    function toast(msg) {
        if (typeof window.showToast === 'function') window.showToast(msg);
    }

    function isAppleTouch() {
        return /iPhone|iPad|iPod/i.test(navigator.userAgent || '')
            || (navigator.platform === 'MacIntel' && Number(navigator.maxTouchPoints || 0) > 1);
    }

    /** Safari (Mac/iOS): отдельный IDB от Chrome; window.open после await часто врёт. */
    function isSafari() {
        var ua = navigator.userAgent || '';
        return /Safari/i.test(ua) && !/Chrome|CriOS|Chromium|Edg|OPR|Firefox|Android/i.test(ua);
    }

    /** После async всегда sheet на Safari/iPhone — только sync-клик открывает вкладку. */
    function preferSheet() {
        return isAppleTouch() || isSafari();
    }

    function isOnline() {
        return navigator.onLine !== false;
    }

    function ensurePdfBlob(blob) {
        if (!blob) return null;
        if (blob.type === 'application/pdf') return blob;
        return new Blob([blob], { type: 'application/pdf' });
    }

    function revokeOwnedUrl(modal) {
        if (!modal) return;
        var url = modal.dataset.blobUrl;
        if (url && url.indexOf('blob:') === 0) {
            try { URL.revokeObjectURL(url); } catch (_) { /* ignore */ }
        }
        delete modal.dataset.blobUrl;
        modal._rbiPdfFile = null;
    }

    function closeSheet() {
        var modal = document.getElementById(MODAL_ID);
        if (!modal) return;
        revokeOwnedUrl(modal);
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }

    /** Sync open: <a target=_blank> надёжнее window.open(blob) в Safari. */
    function openUrlSync(url) {
        if (!url) return false;
        try {
            var a = document.createElement('a');
            a.href = url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            a.remove();
            return true;
        } catch (_) {
            try {
                var win = window.open(url, '_blank');
                return !!(win && !win.closed);
            } catch (e2) {
                return false;
            }
        }
    }

    function triggerDownload(url, fileName) {
        var a = document.createElement('a');
        a.href = url;
        a.download = fileName || 'document.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    async function shareFile(file, title) {
        if (!file) return false;
        try {
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: title || file.name,
                    files: [file]
                });
                return true;
            }
        } catch (e) {
            if (e && e.name === 'AbortError') return true;
            console.warn('[rbiOpenPdfDocument] share failed', e);
        }
        return false;
    }

    function ensureSheet() {
        var modal = document.getElementById(MODAL_ID);
        if (modal) return modal;

        modal = document.createElement('div');
        modal.id = MODAL_ID;
        modal.className = 'fixed inset-0 z-[9999] hidden flex-col items-center justify-end sm:justify-center bg-slate-900/70 p-4';
        modal.innerHTML =
            '<div class="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden" data-pdf-open-panel>' +
            '  <div class="px-4 pt-4 pb-2">' +
            '    <div id="rbi-pdf-open-title" class="text-sm font-bold text-slate-900 dark:text-white truncate">PDF</div>' +
            '    <div id="rbi-pdf-open-hint" class="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug"></div>' +
            '  </div>' +
            '  <div class="p-3 flex flex-col gap-2">' +
            '    <button type="button" data-pdf-open-action="open" class="w-full py-3 rounded-xl bg-indigo-600 text-white text-[12px] font-black uppercase tracking-wide active:scale-[0.98]">Открыть стандартно</button>' +
            '    <button type="button" data-pdf-open-action="share" class="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-[12px] font-bold active:scale-[0.98]">Поделиться</button>' +
            '    <button type="button" data-pdf-open-action="download" class="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-[12px] font-bold active:scale-[0.98]">Скачать</button>' +
            '    <button type="button" data-pdf-open-action="close" class="w-full py-2.5 rounded-xl text-slate-500 text-[11px] font-semibold">Закрыть</button>' +
            '  </div>' +
            '</div>';

        (document.getElementById('app-modals') || document.body).appendChild(modal);

        modal.addEventListener('click', function (e) {
            if (e.target === modal) {
                closeSheet();
                return;
            }
            var btn = e.target && e.target.closest ? e.target.closest('[data-pdf-open-action]') : null;
            if (!btn || !modal.contains(btn)) return;
            var action = btn.getAttribute('data-pdf-open-action');
            var openUrl = modal.dataset.openUrl || modal.dataset.blobUrl || '';
            var fileName = modal.dataset.fileName || 'document.pdf';

            if (action === 'close') {
                closeSheet();
                return;
            }
            if (action === 'open') {
                if (!openUrlSync(openUrl)) {
                    toast('Не удалось открыть вкладку. Попробуйте «Скачать» или «Поделиться».');
                }
                return;
            }
            if (action === 'download') {
                if (!openUrl) {
                    toast('Файл недоступен');
                    return;
                }
                triggerDownload(openUrl, fileName);
                toast('Файл сохранён');
                return;
            }
            if (action === 'share') {
                var file = modal._rbiPdfFile;
                if (!file) {
                    toast('Нечего отправить — скачайте файл');
                    return;
                }
                shareFile(file, modal.dataset.title || fileName);
            }
        });

        return modal;
    }

    function showSheet(opts) {
        var modal = ensureSheet();
        revokeOwnedUrl(modal);

        var title = opts.title || 'PDF';
        var fileName = opts.fileName || 'document.pdf';
        var httpsUrl = opts.httpsUrl || '';
        var blobUrl = opts.blobUrl || '';
        var fromLocal = !!blobUrl;
        var openUrl = blobUrl || httpsUrl || '';

        modal.dataset.title = title;
        modal.dataset.fileName = fileName;
        modal.dataset.openUrl = openUrl || '';
        if (blobUrl) modal.dataset.blobUrl = blobUrl;
        modal._rbiPdfFile = opts.file || null;

        var titleEl = document.getElementById('rbi-pdf-open-title');
        if (titleEl) titleEl.textContent = title;

        var hintEl = document.getElementById('rbi-pdf-open-hint');
        if (hintEl) {
            hintEl.textContent = fromLocal
                ? 'Файл с устройства (кэш). Откроется локально, без загрузки из сети.'
                : 'Локальной копии в этом браузере нет — откроется ссылка из интернета. Кэш Chrome и Safari раздельный.';
        }

        var shareBtn = modal.querySelector('[data-pdf-open-action="share"]');
        if (shareBtn) {
            shareBtn.classList.toggle('hidden', !modal._rbiPdfFile);
        }

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    /**
     * @param {{ title?: string, fileName?: string, httpsUrl?: string, blob?: Blob, arrayBuffer?: ArrayBuffer }} opts
     */
    window.rbiOpenPdfDocument = async function rbiOpenPdfDocument(opts) {
        opts = opts || {};
        var title = opts.title || 'PDF';
        var fileName = opts.fileName || 'document.pdf';
        if (!/\.pdf$/i.test(fileName)) fileName = fileName + '.pdf';

        var httpsUrl = (opts.httpsUrl && String(opts.httpsUrl).indexOf('http') === 0)
            ? String(opts.httpsUrl)
            : '';

        var blob = ensurePdfBlob(opts.blob || null);
        if (!blob && opts.arrayBuffer) {
            blob = new Blob([opts.arrayBuffer], { type: 'application/pdf' });
        }

        if (!blob && !httpsUrl) {
            toast('PDF не найден');
            return { ok: false, mode: 'empty' };
        }

        var blobUrl = blob ? URL.createObjectURL(blob) : '';
        var file = blob
            ? new File([blob], fileName, { type: 'application/pdf' })
            : null;

        // Есть локальный файл — https не используем никогда.
        if (blobUrl) {
            // Chrome desktop: можно сразу вкладку. Safari/iPhone — только sheet (живой жест).
            if (!preferSheet() && openUrlSync(blobUrl)) {
                setTimeout(function () {
                    try { URL.revokeObjectURL(blobUrl); } catch (_) { /* ignore */ }
                }, 60000);
                return { ok: true, mode: 'blob-tab' };
            }
            showSheet({
                title: title,
                fileName: fileName,
                httpsUrl: '',
                blobUrl: blobUrl,
                file: file
            });
            return { ok: true, mode: 'sheet-local' };
        }

        // Нет локального — сеть. На Safari никогда не auto-open после await.
        if (httpsUrl && isOnline() && !preferSheet() && openUrlSync(httpsUrl)) {
            return { ok: true, mode: 'https' };
        }

        showSheet({
            title: title,
            fileName: fileName,
            httpsUrl: httpsUrl,
            blobUrl: '',
            file: null
        });
        return { ok: true, mode: 'sheet-network' };
    };

    window.rbiClosePdfDocumentSheet = closeSheet;

    window.RBI = window.RBI || {};
    window.RBI.utils = window.RBI.utils || {};
    window.RBI.utils.pdfOpen = {
        open: window.rbiOpenPdfDocument,
        close: closeSheet
    };
}());
