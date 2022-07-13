<script>
import {h, inject, nextTick, resolveComponent} from 'vue'

export default {
  name : 'Column',
  props : ['name'],
  setup(props){
    let grid = inject(props.name);
    return {grid}
  },
  methods : {
    hideContext : function(e){
       if(e.target.closest('.context-menu-wrapper.' + this.name) == null)
         this.grid.system.context.show = false;
    },
    showContext : async function($event,element){
      this.grid.system.context.show = true;
      this.grid.system.context.row = element;
      await nextTick();
      let rect = document.querySelector('.vdg_contextMenuWrapper.' + this.name).getBoundingClientRect();

      if(($event.clientY + rect.height) > window.innerHeight)
        this.grid.system.context.top = window.innerHeight - rect.height - 10;
      else
        this.grid.system.context.top = $event.clientY;

      if(($event.clientX + rect.width) > window.innerWidth)
        this.grid.system.context.left = window.innerWidth - rect.width - 20;
      else
        this.grid.system.context.left = $event.clientX;

      document.addEventListener('click',this.hideContext);
    },

    // Рекурсивно отсоовываем вложенности пришедшей колони
    getContentGrid : function(column){
      if (column instanceof Object) {

        if (!("tag" in column))
          column.tag = 'span';

        if (!("params" in column))
          column.params = {};

        return h(
            column.tag,
            column.params,
            [this.getContentGrid(column.value)]
        );
      } else {
        return h(
            'span',
            {},
            column
        );
      }
    },
  },
  watch : {
    // Наблюдаем за переменной для удаления события скрытия контекстного меню
    'grid.system.context.show' : function(val) {
      if(!val)
        document.removeEventListener('click',this.hideContext)
    }
  },
  render(){
    let row = [];

    // ниже перебеам строки
    //console.log('элементы ', this.grid.elements)
    this.grid.elements.forEach(element => {

      // console.log('элемент ', element)
      // в пределах текущей строки надо перебрать "условно все колонки(это массив строк)" и посмотреть на последнию строку, узнать ее end и найти
      // максимальный end для текущей строчки и это будет параметр max
      let max = 0;
      for (const [key, resultElement] of Object.entries(element)) {
        if(max < resultElement[resultElement.length - 1].end)
          max = resultElement[resultElement.length - 1].end
      }

      //
      let columnElement = [];
      //console.log('columnKey', this.grid.system.columnKey)

      this.grid.system.columnKey.forEach(columnName => {
        element[columnName].forEach((column, index) => {
          let endRow = column.end;

          //*********************************************************************

          //Оставить на случай если на большой вложенности возникнут глюки
          //Отвечает за высоту колонки
          if (element[columnName].length <= 1)
            endRow = (element[columnName].length - 1 == index ? max : column.end);

          // По факту что делает код выше (два варианта) :
          //  -  если массив с содержимым колонки вообще пустой
          //     (сработает условие element[columnName].length < 1 то есть длина массива равна нулю), то по
          //     идее element[columnName].forEach сюда вообще не зайдет и ничего делать не будет..... этого варианта внутри forEach никогда не случиться

          //  -  массив содержит одну ячеечку (сработает условие element[columnName].length = 1 ), то возможен вариант
          //     когда нижняя линия отрисовки endRow будет менше общей высоты колонки max, то ИМЕННО на этот случай ниже есть проверка
          //     когда мы дорисовываем "пустышку" догоняя колонку до нужной высоты... возможно при этои собъется центровна значаний
          //     ячеечки по высоте колонки и не будет ясна вложенность..... поэтому можно это исправить сразу и сказать что endRow = max и
          //     тогда ниже дополнительный if уже не сработает и не наритсует пустышку... в итоге  будет просто колона с одной ячеечкой...
          //     Вопрос в этой странной доп. проверке  element[columnName].length - 1 == index ....
          //     длина массива и минус 1  при этом всегда будет равна нулю и index первого и единственного элемента в массиве тоже всегда равен нулю....
          //     Возможно есть какой-то еще смысл в этой проверке.... но очень не явный

          // Если логика верна то можно сделать как ниже..

          //  if (element[columnName].length = 1)
          //    endRow =  max

          //*********************************************************************

          let columnValues;

          // готовый объект пропсов для генерации dom элемента функцией h
          let defaultParentParams = {
            class: ['vdg_contentWrapper_columnContent', columnName],
            style: {
              'grid-row': column.start + '/' + endRow,
              'overflow-x': 'auto',
            }
          };

          // Если value обьект то генерируем версту переданую в нем
          //это в том случа если с бэка приходит value не просто строка а именно объект с нужной версткой ,например надо поправить цвет ячейки
          // иначе это обычный dom элемент со значением value
          if (column.value instanceof Object) {

            if (!("tag" in column))
              column.tag = 'span';

            if (!("params" in column))
              column.params = {};

            // Дальше рекурсивно генерируем всю вложеность
            columnValues = h(
                column.value.tag,
                column.value.params,
               [this.getContentGrid(column.value.value)]
            );

            // Возможность передать параметры ячейке родителю
            if (!("parentParams" in column.value))
              column.value.parentParams = {};

            // Возможность передать Событие клика ячейке родителю
            if ("onClick" in column.value.parentParams)
              defaultParentParams.onClick = eval(column.value.parentParams.onClick)


            if ("style" in column.value.parentParams) {
              defaultParentParams.style = {
                ...defaultParentParams.style,
                ...column.value.parentParams.style
              }
            }

            if ("class" in column.value.parentParams) {
              defaultParentParams.class.concat(column.value.parentParams.class)
            }

          } else {
            columnValues = h(
                'span',
                {},
                column.value
            );
          }

          // Иконка для контекстного меню
          // перезапишет ранее выше указанное значение columnValues в отрисовку иконки вызова контекстного меню
          if(columnName == 'icon' && ('context' in element || this.grid.context.length)){
            columnValues = [h(
                resolveComponent('el-icon'),
                {
                  onClick : async $event => {
                    $event.stopPropagation();
                    this.showContext($event,element);
                  }
                },
                () => [h(
                    resolveComponent('expand'),
                    {},
                    ''
                )]
            )]
          }

          columnElement.push(h(
              'div',
              defaultParentParams,
              columnValues
          ));

         // ниже - если мы нарисовали текущую ячеечку в колонке и (при условии что есть следующая ячеечка) ее endRow (нижняя линия рисования)
         // меньше чем start(начальная линия рисования)  у следующей ячеечки
         // то надо вставить ниже "пустышку" ,чтоб заполнить этот разрыв. Чтоб сохранить "уровни вложенности" в колонке
          if (element[columnName][index + 1] && endRow < element[columnName][index + 1].start) {
            columnElement.push(h(
                'div',
                {
                  class: 'vdg_contentWrapper_columnContent',
                  style: {
                    'grid-row': endRow + '/' + element[columnName][index + 1].start
                  }
                },
                ''
            ));
          }

          // ниже - если мы нарисовали текущую ячеечку в колонке и (при условии что НЕТ следующей ячеечки) и
          // у текущей ячеечки endRow не достиг max "линии рисования" в колонке то надо "догнаться" пустой ячеечкой на всю ширину колонки
          if (!element[columnName][index + 1] && endRow < max) {
            columnElement.push(h(
                'div',
                {
                  class: 'vdg_contentWrapper_columnContent',
                  style: {
                    'grid-row': endRow + '/' + max
                  }
                },
                ''
            ));
          }
        });
      })

      row.push(h(
          'div',
          {
            class : 'vdg_contentWrapper_rowContent',
            style : {
               'grid-template-columns' : this.grid.system.gtc,
            },
            onContextmenu : $event => {
              if('context' in element || this.grid.context.length) {
                $event.preventDefault();
                this.showContext($event, element);
              }
            },
          },
          columnElement
          )
      )

    });


    return h(
        'div',
        {
            class : ['vdg_contentWrapper', this.name],
            style : {
              width : this.grid.system.scrollWidth +'px',
              'clip-path' : 'inset(0px)',
            }
        },
        row
    );
  }
}
</script>