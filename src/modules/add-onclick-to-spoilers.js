/**
 * Этот модуль добавляет пустой атрибут onclik к заголовкам спойлеров,
 * чтобы VimFx воспринимал спойлеры как кликабельный объект и давал
 * кликать по ним без мышки, с помощью клавиатуры
 */
define(['jquery', 'module', 'ls-hook'], function($, Module, lsHook) {

    function AddOnClickToSpoilersModule() {
    }

    AddOnClickToSpoilersModule.prototype = new Module()

    AddOnClickToSpoilersModule.prototype.attach = function addOnClickToSpoilers_attach(config) {
        this._hook = this.onDataLoaded.bind(this)
        lsHook.add('ls_comments_load_after', this._hook)
        lsHook.add('ls_userfeed_get_more_after', this._hook)

        this.addAttr()
    }

    AddOnClickToSpoilersModule.prototype.detach = function addOnClickToSpoilers_detach() {
        lsHook.remove('ls_comments_load_after', this._hook)
        lsHook.remove('ls_userfeed_get_more_after', this._hook)
        this._hook = null

        this.removeAttr()
    }

    AddOnClickToSpoilersModule.prototype.onDataLoaded = function addOnClickToSpoilers_onDataLoaded() {
        this.addAttr()
    }

    AddOnClickToSpoilersModule.prototype.addAttr = function addOnClickToSpoilers_addAttr() {
        $('.spoiler-title').each(function() {
            if (!this.hasAttribute('onclick')) {
                this.setAttribute('onclick', '')
            }
        })
    }

    AddOnClickToSpoilersModule.prototype.removeAttr = function addOnClickToSpoilers_removeAttr() {
        // в старой версии табуна спойлеры создавались с onclick="return true;"
        // соответственно, из этих спойлеров удалять атрибут не будем: удаляем только
        // пустые атрибуты, созданные этим плагином
        $('.spoiler-title').each(function() {
            if (this.getAttribute('onclick') == '') {
                this.removeAttribute('onclick')
            }
        })
    }

    return AddOnClickToSpoilersModule
})
