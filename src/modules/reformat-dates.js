define(['jquery', 'module', 'basic-cfg-panel-applet', 'format-date', 'ls-hook'], function($, Module, BasicCfgPanelApplet, formatDate, lsHook) {
    function ReformatDatesModule() { }

    ReformatDatesModule.prototype = new Module()

    ReformatDatesModule.prototype.init = function reformatDates_init(config) {
        config = config || {
            format: 'd MMM yyyy, H:mm:ss',
        }
        this.attrName = this.getApp() + '-' + this.getId() + '-data'
        return config
    }

    ReformatDatesModule.prototype.getLabel = function reformatDates_getLabel() {
        return "Сменить формат дат"
    }

    ReformatDatesModule.prototype.attach = function reformatDates_attach(config) {
        this.processPage()

        this._hook = this.processPage.bind(this)

        lsHook.add('ls_comments_load_after', this._hook)
        lsHook.add('ls_userfeed_get_more_after', this._hook)
    }

    ReformatDatesModule.prototype.detach = function reformatDates_detach() {
        lsHook.remove('ls_comments_load_after', this._hook)
        lsHook.remove('ls_userfeed_get_more_after', this._hook)

        delete this._hook

        this.unprocessPage()
    }

    ReformatDatesModule.prototype.processPage = function reformatDates_processPage() {
        var self = this
          , cfg = self.getConfig()

        $('[datetime]').each(function() {
            var el = $(this)

            if (!el.data(self.attrName) && !el.children().length) {
                el.data(self.attrName, {
                    origText: el.text(),
                })
                el.html(formatDate(el.attr('datetime'), cfg.format, false))
            }
        })
    }

    ReformatDatesModule.prototype.unprocessPage = function reformatDates_unprocessPage() {
        var self = this

        $('[datetime]').each(function() {
            var el = $(this)
              , data = el.data(self.attrName)

            if (data) {
                el.text(data.origText)
                el.removeData(self.attrName)
            }
        })
    }

    ReformatDatesModule.prototype.createCfgPanelApplet = function reformatDates_createCfgPanelApplet() {
        var txtFormat = $('<input>')
            .attr('type', 'text')
            .attr('name', 'format')
            .css({
                width: 150,
             })

        return new BasicCfgPanelApplet(this.getLabel(), ": ", txtFormat, "<br/>",
                '<p style="padding-left: 20px">Формат — это строка вроде "d MMMM yyyy, HH:mm", где:<br/>' +
                'yyyy, yy — год (2011 или 11)<br/>' +
                'MMMM, MMM, MM, M — месяц (августа, авг, 08, 8)<br/>' +
                'dd, d, HH, H, mm, m, ss, s — день, часы, минуты, секунды (09 или 9)<br/>' +
                'Используйте \\ если нужны буквы y,M,d,H,m,s: \\M, \\s и т.д.</p>')
    }

    return ReformatDatesModule
})
