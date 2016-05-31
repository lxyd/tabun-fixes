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
      , lastCommentsCount
      , lastArticlesCount
      , lastCommentIds = []
      , lastArticleIds = []

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
        initHooks()
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

    function initHooks() {
        lastCommentsCount = getCommentsCount()
        lastArticlesCount = getArticlesCount()
        lastCommentIds = getCommentIds()
        lastArticleIds = getArticleIds()
    }

    function checkAndInvoke() {
        if (hooks.ls_userfeed_get_more_after.length) {
            var articlesCount = getArticlesCount()
            if (articlesCount > lastArticlesCount) {
                lastArticlesCount = articlesCount
                var articleIds = getArticleIds()
                var newArticleIds = articleIds.filter(function(id) {
                    return lastArticleIds.indexOf(id) < 0
                })
                lastArticleIds = articleIds
                invokeHook('ls_userfeed_get_more_after', newArticleIds)
            }
        }

        if (hooks.ls_comments_load_after.length) {
            var commentCount = getCommentsCount()
            if (commentCount > lastCommentsCount) {
                lastCommentsCount = commentCount
                var commentIds = getCommentIds()
                var newCommentIds = commentIds.filter(function(id) {
                    return lastCommentIds.indexOf(id) < 0
                })
                lastCommentIds = commentIds
                invokeHook('ls_comments_load_after', newCommentIds)
            }
        }
    }

    function invokeHook(name) {
        var args = Array.prototype.slice.call(arguments, 1);
        (hooks[name]||[]).forEach(function(fn) {
            fn.apply(global, args)
        })
    }

    function getArticlesCount() {
        return document.getElementsByTagName('article').length
    }

    function getCommentsCount() {
        return document.getElementsByClassName('comment').length
    }

    function getArticleIds() {
        return Array.prototype.map.call(document.querySelectorAll('ARTICLE.topic .topic-title A'), function(e) {
            return parseInt(/([0-9]+)\.html$/.exec(e.getAttribute('href'))[1], 10)
        })
    }

    function getCommentIds() {
        return Array.prototype.map.call(document.querySelectorAll('.comment'), function(e) {
            return parseInt(/^comment_id_([0-9]+)$/.exec(e.getAttribute('id'))[1], 10)
        })
    }

    return {
        add:    addLsHook,
        remove: removeLsHook,
    }
})
