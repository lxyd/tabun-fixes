define(['app'], function(App) {

    new App('tabun-fixes')
        .add('cfg-panel',              { defaultEnabled:true })
        .add('alter-same-page-links',  { defaultEnabled:true,  cfgPanel:{column:1} })
        .add('alter-links-to-mirrors', { defaultEnabled:true,  cfgPanel:{column:1} })
        .add('reveal-lite-spoilers',   { defaultEnabled:false, cfgPanel:{column:1} })
        .add('spacebar-move-to-next',  { defaultEnabled:false, cfgPanel:{column:2} })
        .add('whats-new',              { defaultEnabled:true,  cfgPanel:{column:2} },
            "• Новый модульный движок<br/>• Совместимость с новым Табуном"
        )
        //.add('fix-scroll',             { defaultEnabled:true, cfgPanel:{skip:true} })
        .start()

})
