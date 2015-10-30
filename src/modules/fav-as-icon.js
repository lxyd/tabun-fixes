define(['jquery', 'module', 'img/star-big-checked', 'img/star-big-unchecked', 'img/star-small-checked', 'img/star-small-unchecked'], function($, Module, imgStarBigChecked, imgStarBigUnchecked, imgStarSmallChecked, imgStarSmallUnchecked) {
    function FavAsIconModule() { }

    FavAsIconModule.prototype = new Module()

    FavAsIconModule.prototype.getLabel = function favAsIcon_getLabel() {
        return 'Заменить "В избранное" на звёздочку'
    }

    FavAsIconModule.prototype.attach = function favAsIcon_attach(config) {
        this.style = $('<style>').text(
            '.comment-info .favourite:before        { ' + genFavBeforeStyle(11, 11, imgStarSmallUnchecked) + ' }' +
            '.comment-info .favourite.active:before { ' + genFavBeforeStyle(11, 11, imgStarSmallChecked)   + ' }' +
            '.topic-info .favourite:before          { ' + genFavBeforeStyle(11, 11, imgStarSmallUnchecked) + ' }' +
            '.topic-info .favourite.active:before   { ' + genFavBeforeStyle(11, 11, imgStarSmallChecked)   + ' }' +
            '.table-talk .favourite:before          { ' + genFavBeforeStyle(17, 17, imgStarBigUnchecked)   + ' }' +
            '.table-talk .favourite.active:before   { ' + genFavBeforeStyle(17, 17, imgStarBigChecked)     + ' }' +

            '.comment-info .favourite { ' + genFavStyle(11, 11) + ' }' +
            '.topic-info .favourite   { ' + genFavStyle(11, 11) + '; padding:0 !important; margin:6px 11px 6px 0px }' +
            '.table-talk .favourite   { ' + genFavStyle(17, 17) + ' }'
        ).appendTo(document.head)
    }

    FavAsIconModule.prototype.detach = function favAsIcon_detach(сonfig) {
        if (this.style) {
            this.style.remove()
        }
        this.style = null
    }

    function genFavBeforeStyle(w, h, img) {
        return 'width:'+w+'px; height:'+h+'px; display:inline-block; content:" "; background:url("'+img+'")'
    }

    function genFavStyle(w, h) {
        return 'width:'+w+'px; height:'+h+'px; display:inline-block; overflow:hidden'
    }

    return FavAsIconModule
})
