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
      , global = this
      , lastUnreadCommentsCount = getUnreadCommentsCount()
      , lastArticlesCount = getArticlesCount()

    function addLsHook(key, fn) {
        hooks[key].push(fn)
        if (!interval) {
            interval = setInterval(checkAndInvoke, 100)
        }
    }

    function removeLsHook(key, fn) {
        var idx = hooks[key].indexOf(fn)
        if (idx >= 0) {
            hooks[key].splice(idx, 1)
        }
        if (interval && !hasHooks()) {
            clearInterval(interval)
            interval = null
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
        var articlesCount = getArticlesCount()
          , unreadCommentCount = getUnreadCommentsCount()
        if (articlesCount > lastArticlesCount) {
            lastArticlesCount = articlesCount
            invokeHook('ls_userfeed_get_more_after')
        }
        if (unreadCommentCount > lastUnreadCommentsCount) {
            lastUnreadCommentsCount = unreadCommentCount
            invokeHook('ls_comments_load_after')
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

    function getUnreadCommentsCount() {
        var el = document.getElementById('new_comments_counter')
        if (el && el.offsetWidth) {
            return parseInt(el.textContent.trim())
        } else {
            return 0
        }
    }

    return {
        add:    addLsHook,
        remove: removeLsHook,
    }
})
