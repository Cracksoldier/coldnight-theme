(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var cards = document.querySelectorAll('.pdf-card');
    if (!cards.length) return;

    var pdfLib      = null;
    var pdfDoc      = null;
    var currentPage = 1;
    var scale       = 1.5;
    var renderTask  = null;
    var loadSeq     = 0;
    var dialog, canvas, ctx, titleEl, pageEl, prevBtn, nextBtn, downloadBtn;

    function buildDialog() {
      if (dialog) return;
      dialog = document.createElement('dialog');
      dialog.className = 'pdf-modal';
      dialog.setAttribute('aria-label', 'PDF Viewer');
      dialog.innerHTML =
        '<div class="pdf-modal__header">' +
          '<span class="pdf-modal__title"></span>' +
          '<div class="pdf-modal__controls">' +
            '<button class="pdf-modal__prev"     aria-label="Previous page">&#8249;</button>' +
            '<span   class="pdf-modal__page">1 / 1</span>' +
            '<button class="pdf-modal__next"     aria-label="Next page">&#8250;</button>' +
            '<button class="pdf-modal__zoom-out" aria-label="Zoom out">&#8722;</button>' +
            '<button class="pdf-modal__zoom-in"  aria-label="Zoom in">&#43;</button>' +
            '<a      class="pdf-modal__download" download aria-label="Download PDF">&#8595;</a>' +
            '<button class="pdf-modal__close"    aria-label="Close">&#215;</button>' +
          '</div>' +
        '</div>' +
        '<div class="pdf-modal__body">' +
          '<canvas class="pdf-modal__canvas"></canvas>' +
        '</div>';
      document.body.appendChild(dialog);

      canvas      = dialog.querySelector('.pdf-modal__canvas');
      ctx         = canvas.getContext('2d');
      titleEl     = dialog.querySelector('.pdf-modal__title');
      pageEl      = dialog.querySelector('.pdf-modal__page');
      prevBtn     = dialog.querySelector('.pdf-modal__prev');
      nextBtn     = dialog.querySelector('.pdf-modal__next');
      downloadBtn = dialog.querySelector('.pdf-modal__download');

      prevBtn.addEventListener('click', function () { goTo(currentPage - 1); });
      nextBtn.addEventListener('click', function () { goTo(currentPage + 1); });
      dialog.querySelector('.pdf-modal__zoom-out').addEventListener('click', function () { zoom(-0.25); });
      dialog.querySelector('.pdf-modal__zoom-in').addEventListener('click',  function () { zoom(0.25); });
      dialog.querySelector('.pdf-modal__close').addEventListener('click', closeModal);

      dialog.addEventListener('click', function (e) { if (e.target === dialog) closeModal(); });
    }

    function loadPdfJs(cb) {
      if (pdfLib) { cb(); return; }
      import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4/build/pdf.min.mjs').then(function (lib) {
        lib.GlobalWorkerOptions.workerSrc =
          'https://cdn.jsdelivr.net/npm/pdfjs-dist@4/build/pdf.worker.min.mjs';
        pdfLib = lib;
        cb();
      }).catch(function (err) {
        console.error('[pdf-viewer] Failed to load PDF.js:', err);
      });
    }

    function renderPage(num) {
      if (!pdfDoc) return;
      pdfDoc.getPage(num).then(function (page) {
        var vp = page.getViewport({ scale: scale });
        canvas.height = vp.height;
        canvas.width  = vp.width;
        if (renderTask) renderTask.cancel();
        renderTask = page.render({ canvasContext: ctx, viewport: vp });
        renderTask.promise.then(function () { renderTask = null; }).catch(function () {});
        currentPage = num;
        pageEl.textContent = num + ' / ' + pdfDoc.numPages;
        prevBtn.disabled = num <= 1;
        nextBtn.disabled = num >= pdfDoc.numPages;
      });
    }

    function goTo(n) {
      if (!pdfDoc || n < 1 || n > pdfDoc.numPages) return;
      renderPage(n);
    }

    function zoom(delta) {
      scale = Math.min(3, Math.max(0.5, +(scale + delta).toFixed(2)));
      renderPage(currentPage);
    }

    function closeModal() {
      dialog.close();
      if (pdfDoc) { pdfDoc.destroy(); pdfDoc = null; }
      if (renderTask) { renderTask.cancel(); renderTask = null; }
      currentPage = 1;
      scale       = 1.5;
    }

    function openCard(card) {
      var src = card.dataset.pdfSrc;
      if (!src) return;
      var seq = ++loadSeq;
      buildDialog();
      titleEl.textContent = card.dataset.pdfTitle || '';
      downloadBtn.href = src;
      loadPdfJs(function () {
        if (seq !== loadSeq) return;
        pdfLib.getDocument(src).promise.then(function (doc) {
          if (seq !== loadSeq) { doc.destroy(); return; }
          if (pdfDoc) { pdfDoc.destroy(); }
          pdfDoc = doc;
          dialog.showModal();
          renderPage(1);
        }).catch(function (err) {
          console.error('[pdf-viewer] Failed to load PDF:', err);
        });
      });
    }

    cards.forEach(function (card) {
      card.addEventListener('click', function () { openCard(card); });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCard(card); }
      });
    });
  });
})();
