define(['jquery', 'module', 'hook'], function($, Module, hook) {

    function FastScrollToCommentModule() {
    }

    FastScrollToCommentModule.prototype = new Module()

    FastScrollToCommentModule.prototype.attach = function fastScrollToComment_attach(config) {
        this._hook = this.onGoToComment.bind(this)
        hook.add('ls.comments.goToNextComment', this._hook)
    }

    FastScrollToCommentModule.prototype.detach = function fastScrollToComment_detach() {
        hook.remove('ls.comments.goToNextComment', this._hook)
        this._hook = null
    }

    FastScrollToCommentModule.prototype.onGoToComment = function fastScrollToComment_onGoToComment() {
        $(window).stop(true)
    }

    return FastScrollToCommentModule

})
