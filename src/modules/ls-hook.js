/**
 * Эмулируем несколько хуков livestreet CMS, нужных для работы скрипта,
 * но недоступных в новой версии табуна
 */
define(['hook'], function(hook) {

    /* {
     *     name: [{
     *         key: key,
     *         val: val,
     *     }]
     * }
     */
    var hookMaps = {}

    var global = this

    var afterXhrHooks = {
        'ls_comments_load_after':     ['ls.comments.load', 'ls.comments.add'],
        'ls_userfeed_get_more_after': ['ls.userfeed.getMore'],
    }

    function addLsHook(name, fn) {
        if (name in afterXhrHooks) {
            addAfterXhrHook(name, fn)
        } else {
            throw new Error("Unsupported livestreet hook '" + name + "'")
        }
    }

    function removeLsHook(name, fn) {
        if (name in afterXhrHooks) {
            removeAfterXhrHook(name, fn)
        }
    }

    function addAfterXhrHook(name, fn) {
        var wrap = createWrapper(fn)
        addWrapper(name, fn, wrap)

        afterXhrHooks[name].forEach(function(fnPath) {
            hook.add(fnPath, wrap, true)
        })
    }

    function removeAfterXhrHook(name, fn) {
        var wrap = getWrapper(name, fn)
        removeWrapper(name, fn)

        afterXhrHooks[name].forEach(function(fnPath) {
            hook.remove(fnPath, wrap, true)
        })
    }

    function createWrapper(fn) {
        return function hookXhr(xhr) {
            var interval = 4
            function checkXhrReady() {
                if (xhr.readyState >= XMLHttpRequest.DONE || xhr.readyState <= XMLHttpRequest.UNSENT) {
                    fn.call(global, xhr, xhr.responseJSON)
                    return
                }
                setTimeout(checkXhrReady, interval)
                if (interval < 512) {
                    interval *= 2
                }
            }
            checkXhrReady()
        }
    }

    function addWrapper(name, fn, wrap) {
        hookMaps[name] = hookMaps[name] || []
        hookMaps[name].push({
            key: fn,
            val: wrap,
        })
    }

    function getWrapper(name, fn) {
        var map = hookMaps[name]
        if (!map) {
            return null
        }
        for (var i = 0; i < map.length; i++) {
            if (map[i].key === fn) {
                return map[i].val
            }
        }
        return null
    }

    function removeWrapper(name, fn) {
        var map = hookMaps[name]
        if (!map) {
            return
        }
        var idx = -1
        for (var i = 0; i < map.length; i++) {
            if (map[i].key === fn) {
                idx = i
                break
            }
        }
        if (idx >= 0) {
            map.splice(idx, 1)
        }
        if (map.length == 0) {
            delete hookMaps[name]
        }
    }

    return {
        add:    addLsHook,
        remove: removeLsHook,
    }
})
