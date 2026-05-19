;(function () {
  'use strict'

  var chips = document.querySelectorAll('.archive-filter-chip')
  if (!chips.length) return

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      chips.forEach(function (c) { c.classList.remove('archive-filter-chip--active') })
      chip.classList.add('archive-filter-chip--active')

      var type  = chip.dataset.filterType
      var value = chip.dataset.filterValue

      document.querySelectorAll('.archive-item').forEach(function (item) {
        var show = type === 'all'
        if (!show && type === 'category') show = item.dataset.category === value
        if (!show && type === 'tag')      show = item.dataset.tags.split('|').indexOf(value) !== -1
        item.hidden = !show
      })

      document.querySelectorAll('.archive-year-group').forEach(function (group) {
        var hasVisible = Array.prototype.some.call(
          group.querySelectorAll('.archive-item'),
          function (i) { return !i.hidden }
        )
        group.hidden = !hasVisible
      })
    })
  })
})()
