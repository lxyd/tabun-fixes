/**
 * Эмулируем несколько хуков livestreet CMS, нужных для работы скрипта,
 * но недоступных в новой версии табуна
 */
define(function() {

    var hooks = {
        ls_comments_load_after: [],
        ls_userfeed_get_more_after: [],
    }
    var interval
      , observer
      , global = this
      , lastCommentsCount = getCommentsCount()
      , lastArticlesCount = getArticlesCount()

    function isObserving() {
        return interval || observer
    }

    function stopObserving() {
        if (interval) {
            clearInterval(interval)
            interval = null
        }
        if (observer) {
            observer.disconnect()
            observer = null
        }
    }

    function startObserving() {
        if (!window.MutationObserver) {
            interval = setInterval(checkAndInvoke, 100)
        } else {
            observer = new MutationObserver(checkAndInvoke)

            var o

            o = document.getElementById('userfeed_loaded_topics')
            if (o) {
                observer.observe(o, {childList:true})
            }

            o = document.getElementById('content')
            if (o) {
                observer.observe(o, {childList:true})
            }

            o = document.getElementById('count-comments')
            if (o) {
                observer.observe(o, {childList:true,characterData:true,subtree:true})
            }
        }
    }

    function addLsHook(key, fn) {
        hooks[key].push(fn)
        if (!isObserving()) {
            startObserving()
        }
    }

    function removeLsHook(key, fn) {
        var idx = hooks[key].indexOf(fn)
        if (idx >= 0) {
            hooks[key].splice(idx, 1)
        }
        if (!hasHooks() && isObserving()) {
            stopObserving()
        }
    }

    function hasHooks() {
        var sum = 0
          , key

        for (key in hooks) {
            sum += hooks[key].length
        }

        return sum > 0
    }

    function checkAndInvoke() {
        console.log('check-and-invoke')
        if (hooks.ls_userfeed_get_more_after.length) {
            var articlesCount = getArticlesCount()
            if (articlesCount > lastArticlesCount) {
                lastArticlesCount = articlesCount
                invokeHook('ls_userfeed_get_more_after')
            }
        }

        if (hooks.ls_comments_load_after.length) {
            var commentCount = getCommentsCount()
            if (commentCount > lastCommentsCount) {
                lastCommentsCount = commentCount
                invokeHook('ls_comments_load_after')
            }
        }
    }

    function invokeHook(name) {
        (hooks[name]||[]).forEach(function(fn) {
            fn.call(global)
        })
    }

    function getArticlesCount() {
        return document.getElementsByTagName('article').length
    }

    function getCommentsCount() {
        return document.getElementsByClassName('comment').length
    }

    return {
        add:    addLsHook,
        remove: removeLsHook,
    }
})
