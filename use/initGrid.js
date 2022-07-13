import {h, resolveComponent, computed, reactive, watch} from "vue";
import {useDialog} from "element-plus";

export default function(data) {
    let grid = reactive({
        header         : {},
        elements       : [],
        system         : {},
        methods        : {},
        context        : [],
        pagination     : {},
        filter         : {},
        networkSetting : {},
        loadJson       : function (){
            console.log('Функция запроса данных с бэка')
        },
        sortContent    : function(type){
            console.log('Функция сортировки по содержимому поля в таблице ', type)
        },
        loading        : false,
    });

    let defaultPagination = {
        show : 'none',//full//top//bottom//none
        defaultSize : 10,
        sizes : [10,20,50],
        layout : ['jumper', 'prev', 'pager', 'next', 'sizes', 'total'],
        pagerCount : 5, // от 5 до 21
        total : 400,
        page : 1,
        changeSize : function(value){
            console.log(`${value} items per page`);
        },
        changePage : function(value){
            console.log(`current page: ${value}`);
        }
    };

    const defaultGrid = {
        filter          : {},
        pagination      : {},
        // Контекстное меню применяемое к каждому ряду таблицы
        context         : {
            row : null, // Ряд применения контекста
            menu : [] // Функции контекстного меню
        },
        // Настройки таблицы
        setting         : {
            minWidth : 70, // Минимальная ширина при ресайзе колонки
            headerWidth : '', // Высота для настройки липучей шапки , возможно устарело
            columnWidth : {}, // Расчитываемый объект ширины колонок
        },
        header          : {}, // Шапка таблицы
        elements        : [], // Элементы
        gridId          : null,//уникальный ID грида, присваювается на бэке исходя из userID, названяи модуля и названия таблицы gridб
        networkSetting  :{
            domain : '', //домен для модуля грида может отличаться от домена основного приложения. Если домен тут не указать, то примениться домен приложения
            module : '', // название модуля
            userId : '' //нужно предать из приложения ID пользователя,
        },
        loadJson        : function(){}, //для запросов на бэк модулем grid
        sortContent     : function (){}, // для сортировкив пределах поля asc/desc
        loading         : false,// признак получения/отправки

    };

    if('context' in data)
        grid.context = data.context;

    if('networkSetting' in data)
        grid.networkSetting = data.networkSetting;

    if ('loadJson' in data)
        grid.loadJson = data.loadJson;

    if ('sortContent' in data)
        grid.sortContent = data.sortContent;

    if('pagination' in data)
        grid.pagination = reactive({
            ...defaultPagination,
            ...data.pagination
        })
    else
        grid.pagination = reactive(defaultPagination);

    let defaultFilter =  {
        data               : {},
        profiles           : [],    // сохраненные профили фильтра
        showProfiles       : false, // меняет ширину окна фильтра и включает компанент с профилями
        show               : false,
        updateSavedProfile : false, // если у сохраненного ранее пользовательского профиля поменялись данные то показать кнопку Сохранить
        filter             : function(data){
            console.log('Обьект фильтра : ' , data);
        },
        clear              : function(data){
            console.log('Функция сброса фильтра', data);
        }
    };
    const filter = {
        number      : {
            change : [
                {
                    value: '=',
                    label: 'Точно'
                },
                {
                    value: '><',
                    label: 'Диапазон'
                },
                {
                    value: '>',
                    label: 'Больше чем'
                },
                {
                    value: '<',
                    label: 'Меньше чем'
                }
            ],
            operation : '=',
            min : '',
            max : '',
            show : true
        },
        list        : {
            multiple : false,
            value : '',
            option : [],
            changeOption : [],
            show : true
        },
        searchList  : {
            multiple : false,
            value : '',
            option : [],
            changeOption : [],
            show : true,
            query : function(data){
                console.log('Метод для запроса на сервер. Текст запроса : ', data);
            }
        },
        date        : {
            change : [
                {
                    value: '=',
                    label: 'Точно'
                },
                {
                    value: '><',
                    label: 'Диапазон'
                },
                {
                    value: '>',
                    label: 'Больше чем'
                },
                {
                    value: '<',
                    label: 'Меньше чем'
                }
            ],
            operation : '=',
            min : '',
            max : '',
            show : true
        },
    };
    if('filter' in data) {
        let gridFilter = {
            ...defaultFilter,
            ...data.filter
        };
        for (let key in data.filter.data) {
            gridFilter.data[key] = {
                ...filter[data.filter.data[key].type],
                ...data.filter.data[key],
                key: key
            };
        };
        grid.filter = reactive(gridFilter)
    }
    else
        grid.filter =  reactive(defaultFilter)

    try{

        if(!('header'in data))
            throw new Error('Field "header" in object Grid required');

        const computedHeaderColumn = {
            sort: 100,
            show: true,
            child: [],
            parent : null
        }

        // Ниже срастили заголовки дефолтовый и тот что был передан в грид
        for (const [k, head] of Object.entries(data.header)) {

            if(!('name' in head))
                throw new Error('Field "name" in header column "'+k+'" required');

            if(!('width' in head))
                throw new Error('Field "width" in header column "'+k+'" required');

            if('sort' in head && head.sort < 0)
                throw new Error('Field "sort" in header column "'+k+'" cannot be negative');

            grid.header[k] = {
                ...computedHeaderColumn,
                ...head,
            }
        }

        for (const [k, head] of Object.entries(grid.header)) {
            if(head.child.length){
                head.child.forEach(el => {
                    grid.header[el].parent = k;
                })
            }
        }

        //ниже тупо в шапке слева добавляется шестеренка
        grid.header['icon'] = {
            name : 'icon',
            width : 80,
            sort : -1,
            show : data.setting,
            child : [],
        }

        //ниже выстроить порядок полей шапки исходя из значения ключа sort
        let sort = 0;
        Object.keys(grid.header).sort((a,b) => {
            return grid.header[a].sort - grid.header[b].sort
        }).forEach(key => {
            sort += 100;
            grid.header[key].sort = sort;
        });

    }catch(e){
        console.error(e);
    }

    grid.system = computed(() => {
        let headerKey = Object.keys(grid.header);

        //ниже убрали поля которые показывать не надо и еще сортанули
        let columnKey = headerKey.filter(el => {
            return !!grid.header[el].show;
        }).sort((a,b) => {
            return grid.header[a].sort - grid.header[b].sort
        });

        return {
            // Используем для построения шапки в таблице (сортированые и доступные для отображения ключи)
            columnKey : columnKey,

            // Используем для построения списка полей в модалке (сортированые и любые для отображения ключи)
            columnShow : headerKey.filter(el => {
                return el != 'icon';
            }).sort((a,b) => {
                return grid.header[a].sort - grid.header[b].sort
            }),
            // grid-template-columns  (gtc) для ширины колонок и тела таблицы
            gtc : (columnKey.map(el => {
                return grid.header[el].width;
            }).join('px ')) + 'px',

            // Общая ширина всех колонок для просчета боковой прокрутки
            scrollWidth : columnKey.reduce(
                (previousValue, currentValue) => previousValue + grid.header[currentValue].width,
                0
            ),
            context : reactive({
                top : 0,
                left : 0,
                show : false,
                row : null,
            }),
            filterDropMenu : reactive({
                top : 0,
                left : 0,
                show : false,
            }),
        }

    });

    grid.methods = {
        addElements : (elements) => {
            //Рекурсивный перебор дерева элементов
            let extractChild = (element,startIndex) => {
                let resultElementsChild = {};
                for (const [key, child] of Object.entries(element)) {
                    let iterator = startIndex;
                    resultElementsChild[key] = [];
                    let resultObject = {};

                    if(!child.length) {
                        resultObject = {
                            value: '',
                            start: iterator,
                            end: iterator + 1
                        }

                        resultElementsChild[key].push(resultObject)
                    }

                    child.forEach(value => {
                        let endMax = iterator + 1;
                        resultObject = {
                            value : value.value,
                            start : iterator,
                            end : endMax
                        }

                        if('child' in value){
                            let childRow = extractChild(value.child, resultObject.start);

                            for (const [childKey, childElement] of Object.entries(childRow)) {
                                if(childKey in resultElementsChild){
                                    resultElementsChild[childKey] = resultElementsChild[childKey].concat(childElement);
                                }else{
                                    resultElementsChild[childKey] = childElement;
                                }
                                let maxEnd = childElement[childElement.length - 1].end;
                                if(maxEnd > resultObject.end)
                                    resultObject.end = maxEnd;
                            }
                        }

                        resultElementsChild[key].push(resultObject)
                        iterator = resultObject.end;
                    })
                }
                return resultElementsChild;
            }

            //Перебор расчета высоты строк
            grid.elements = elements.map(element => {

                let resultElements = {};

                for (const [key, target] of Object.entries(element)) {
                    resultElements[key] = [];
                    let changeValue = true;
                    target.forEach((value, index) => {
                        let back = resultElements[key][index - 1];
                        let resultObject = {
                            value: value.value,
                            start: back ? back.end : index + 1,
                            end: back ? back.end + 1 : index + 2
                        }
                        if ('child' in value) {
                            let childRow = extractChild(value.child, resultObject.start);

                            for (const [key, childElement] of Object.entries(childRow)) {
                                if (key in resultElements) {
                                    resultElements[key] = resultElements[key].concat(childElement);
                                } else {
                                    resultElements[key] = childElement;
                                }
                                let maxEnd = childElement[childElement.length - 1].end;
                                if (maxEnd > resultObject.end)
                                    resultObject.end = maxEnd;
                            }
                        }

                        resultElements[key].push(resultObject);
                        changeValue = false;
                    })
                    if (changeValue)
                        resultElements[key].push({
                            value: '',
                            start: 1,
                            end: 2
                        });
                }

                resultElements['icon'] = [{
                    value: '',
                    start: 1,
                    end: 2
                }]

                if('context' in element)
                    resultElements['context'] = element.context

                return resultElements;
            });
        },
        normalizeFilterData : (data) => {
            grid.filter.data = {...grid.filter.data, ...data};
            for (let key in grid.filter.data) {
                grid.filter.data[key] = {
                    ...filter[grid.filter.data[key].type],
                    ...grid.filter.data[key],
                    key: key
                };
            };
        },
    };

    watch(() => grid.filter.data, (newValue, oldValue) => {grid.filter.updateSavedProfile = true},{deep : true});

    return grid;

};