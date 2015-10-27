define(['module', 'basic-cfg-panel-applet'], function(Module, BasicCfgPanelApplet) {

    function RevealLiteSpoilersModule() { }

    RevealLiteSpoilersModule.prototype = new Module()

    RevealLiteSpoilersModule.prototype.init = function revealLiteSpoilers_init(config) {
        config = config || {
            alwaysReveal: false,
        }
        return config
    }

    RevealLiteSpoilersModule.prototype.getLabel = function revealLiteSpoilers_getLabel() {
        return "Приоткрывать лайт-спойлеры при наведении на пост/коммент"
    }

    RevealLiteSpoilersModule.prototype.attach = function revealLiteSpoilers_attach(config) {
        console.log('attach', this._style)
        this._generateStyleSheet(config)
        this._style.appendTo(document.head)
    }

    RevealLiteSpoilersModule.prototype.detach = function revealLiteSpoilers_detach(сonfig) {
        console.log('detach', this._style)
        this._style.remove()
        this._style = null
    }

    RevealLiteSpoilersModule.prototype.createCfgPanelApplet = function revealLiteSpoilers_createCfgPanelApplet() {
        var chkAlways = $('<input>')
                .attr('type', 'checkbox')
                .attr('name', 'alwaysReveal')

        return new BasicCfgPanelApplet(this.getLabel(),
                $("<br/>"),
                $('<label>').text("Всегда светить лайт-спойлеры").prepend(chkAlways))
    }

    RevealLiteSpoilersModule.prototype._generateStyleSheet = function revealLiteSpoilers_generateStyleSheet(config) {
        // http://userstyles.org/styles/92211/night-tabun
        var nightTabun = getComputedStyle($('<span>').attr('class', 'spoiler-gray')[0]).backgroundColor == "rgb(63, 53, 61)"

        // always visible state
        var transBgColor           = nightTabun ? '#2F252D' : '#EEE'
        var transTextColor         = nightTabun ? '#8F8F8F' : '#999'
        var transATextColor        = nightTabun ? '#7C89CA' : '#66AAFF'
        var transAVisitedTextColor = nightTabun ? '#7C89CA' : '#66AAFF'

        // hover state (fully visible)
        var hoverTextColor         = nightTabun ? '#DFDFDF' : '#666'
        var hoverATextColor        = nightTabun ? '#7C89CA' : '#0099FF'
        var hoverAVisitedTextColor = nightTabun ? '#7C89CA' : '#0099FF'

        var containers = ['.comment', '.comment-preview', '.topic', '.profile-info-about']
            // селекторы для спойлеров в обычном состоянии
          , selectorSpoiler = containers.map(function(s) { return s + ' .spoiler-gray' }).join(', ')
          , selectorA = containers.map(function(s) { return s + ' .spoiler-gray A' }).join(', ')
          , selectorAVisited = containers.map(function(s) { return s + ' .spoiler-gray A:visited' }).join(', ')
            // селекторы для наведённого коммента/поста
          , selectorPostHoverSpoiler = containers.map(function(s) { return s + ':hover .spoiler-gray' }).join(', ')
          , selectorPostHoverA = containers.map(function(s) { return s + ':hover .spoiler-gray A' }).join(', ')
          , selectorPostHoverAVisited = containers.map(function(s) { return s + ':hover .spoiler-gray A:visited' }).join(', ')
            // и более специфичные селекторы для оригинального лайтспойлера в наведённом состоянии (иначе эти стили не пробиваются через наши)
          , selectorHoverSpoiler = containers.map(function(s) { return s + ':hover .spoiler-gray:hover' }).join(', ')
          , selectorHoverA = containers.map(function(s) { return s + ':hover .spoiler-gray:hover A' }).join(', ')
          , selectorHoverAVisited = containers.map(function(s) { return s + ':hover .spoiler-gray:hover A:visited' }).join(', ')

        if (config.alwaysReveal) {
            this._style = $('<style>').text(
                selectorSpoiler + ' { background-color: ' + transBgColor + ' !important; color: ' + transTextColor + ' !important; } ' +
                selectorA + ' { color: ' + transATextColor + ' !important; } ' +
                selectorAVisited + ' { color: ' + transAVisitedTextColor + ' !important; } ' +
                // и более специфичные селекторы для оригинального лайтспойлера в наведённом состоянии (иначе эти стили не пробиваются через наши)
                selectorHoverSpoiler + ' { background-color: transparent !important; color: ' + hoverTextColor + ' !important; } ' +
                selectorHoverA + ' { background-color: transparent !important; color: ' + hoverATextColor + ' !important; } ' +
                selectorHoverAVisited + ' { background-color: transparent !important; color: ' + hoverAVisitedTextColor + ' !important; } '
            )
        } else {
            this._style = $('<style>').text(
                selectorPostHoverSpoiler + ' { background-color: ' + transBgColor + ' !important; color: ' + transTextColor + ' !important; } ' +
                selectorPostHoverA + ' { color: ' + transATextColor + ' !important; } ' +
                selectorPostHoverAVisited + ' { color: ' + transAVisitedTextColor + ' !important; } ' +
                // и более специфичные селекторы для оригинального лайтспойлера в наведённом состоянии (иначе эти стили не пробиваются через наши)
                selectorHoverSpoiler + ' { background-color: transparent !important; color: ' + hoverTextColor + ' !important; } ' +
                selectorHoverA + ' { background-color: transparent !important; color: ' + hoverATextColor + ' !important; } ' +
                selectorHoverAVisited + ' { background-color: transparent !important; color: ' + hoverAVisitedTextColor + ' !important; } '
            )
        }

    }

    return RevealLiteSpoilersModule
})
