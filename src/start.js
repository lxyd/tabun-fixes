define(['app'], function(App) {

    new App('tabun-fixes')
        .add('cfg-panel',               { defaultEnabled:true })
        .add('add-onclick-to-spoilers', { defaultEnabled:true })
        .add('fast-scroll-to-comment',  { defaultEnabled:true })
        .add('sync-config-among-tabs',  { defaultEnabled:true })
        .add('alter-same-page-links',   { defaultEnabled:true,  cfgPanel:{column:1} })
        .add('alter-links-to-mirrors',  { defaultEnabled:true,  cfgPanel:{column:1} })
        .add('reveal-lite-spoilers',    { defaultEnabled:false, cfgPanel:{column:1} })
        .add('open-nested-spoilers',    { defaultEnabled:false, cfgPanel:{column:1} })
        .add('spacebar-move-to-next',   { defaultEnabled:false, cfgPanel:{column:2} })
        .add('fav-as-icon',             { defaultEnabled:false, cfgPanel:{column:2} })
        .add('favicon-unread-count'  ,  { defaultEnabled:true,  cfgPanel:{column:2} })
        .add('narrow-tree',             { defaultEnabled:false, cfgPanel:{column:2} })
        .add('whats-new',               { defaultEnabled:true,  cfgPanel:{column:2} },
            "• Новый модульный движок<br/>• Совместимость с новым Табуном"
        )
        .start()

})
