define(['app'], function(App) {

    new App('tabun-fixes')
        .add('cfg-panel',              { defaultEnabled:true })
        .add('alter-links-to-mirrors', { defaultEnabled:true, cfgPanel:{column:1} })
        .add('whats-new',              { defaultEnabled:true, cfgPanel:{column:2} },
            "• Новый модульный движок<br/>• Совместимость с новым Табуном"
        )
        //.add('fix-scroll',             { defaultEnabled:true, cfgPanel:{skip:true} })
        .start()

})
