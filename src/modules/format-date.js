/**
 * Переформатирует дату/время, представленную в виде строки isoDateTime, например 2013-02-06T23:01:33+04:00
 * в требуемый формат. Допустимые элементы формата:
 * - yyyy, yy - год (четыре или две цифры)
 * - M, MM, MMM, MMMM - месяц (одна/две цифры или сокращённое/полное название)
 * - d, dd - день
 * - H, HH - час
 * - m, mm - минуты
 * - s, ss - секунды
 *
 * @param strDate - дата в формате isoDateTime
 * @param strFormat - строка формата
 * @param bToLocal - конвертировать ли дату в локальную из той зоны, в которой она представлена
 *
 * @return переформатированные дату/время
 */
define(function() {
    var aMonthsLong = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
      , aMonthsShort = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек']

    function padIntWithZero(x) {
        return x < 10 ? '0' + x : '' + x
    }

    return function formatDate(strDate, strFormat, bToLocalDate) {
        var arr
        if (!bToLocalDate) {
            arr = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/.exec(strDate)
        } else {
            var d = new Date(strDate)
            arr = [
                null,
                '' + d.getFullYear(),
                padIntWithZero(d.getMonth() + 1),
                padIntWithZero(d.getDate()),
                padIntWithZero(d.getHours()),
                padIntWithZero(d.getMinutes()),
                padIntWithZero(d.getSeconds()),
                padIntWithZero(d.getMilliseconds()),
            ]
        }
        return strFormat.replace(/yyyy|yy|MMMM|MMM|MM|M|dd|d|HH|H|mm|m|ss|s/g, function(pattern) {
            switch (pattern) {
                case 'yyyy': return arr[1]
                case 'yy'  : return arr[1].substring(2)
                case 'MMMM': return aMonthsLong[parseInt(arr[2], 10)-1]
                case 'MMM' : return aMonthsShort[parseInt(arr[2], 10)-1]
                case 'MM'  : return arr[2]
                case 'M'   : return parseInt(arr[2], 10)
                case 'dd'  : return arr[3]
                case 'd'   : return parseInt(arr[3], 10)
                case 'HH'  : return arr[4]
                case 'H'   : return parseInt(arr[4], 10)
                case 'mm'  : return arr[5]
                case 'm'   : return parseInt(arr[5], 10)
                case 'ss'  : return arr[6]
                case 's'   : return parseInt(arr[6], 10)
            }
        })
    }
})
