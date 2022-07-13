<script>
import {inject, nextTick, h, Fragment, resolveComponent} from "vue";
import {CaretBottom, CaretTop} from "@element-plus/icons";

export default {
  name : 'HeaderRow',
  props : ['name'],
  setup(props){
    let grid = inject(props.name);
    return {grid}
  },
  render() {

    return h(
        Fragment,
        null,
        [
            // Формирование шапки обертка
            h(
                'div',
                {
                  class : ['vdg_rowHeader', this.name],
                  style : {
                    'grid-template-columns' : this.grid.system.gtc
                  }
                },
                // Формирование колонок шапки из видимых сортированых элементов

                this.grid.system.columnKey.map(el => {
                    return h(
                        'div',
                        {
                          class : ['vdg_rowHeader_columnHeader',el],
                          ref : 'drag_'+ el,
                          onMousedown : $event => this.onDragStart($event,el),
                        },
                        (() => {
                          if(el == 'icon'){
                            return [
                              h(
                                  resolveComponent('el-icon'),
                                  {
                                    onClick : $event => {this.dialogVisible = true}
                                  },
                                  () => h(resolveComponent('tools'))

                              ),
                              //вертикальная палочка
                              h(
                                  'div',
                                  {
                                    class : 'vdg_rowHeader_columnHeader_handle'
                                  }
                              )
                            ]
                          }else{
                            return [
                              h(
                                  resolveComponent('el-tooltip'),
                                  {
                                    content : this.grid.header[el].name,
                                    disabled : this.tooltip(el),
                                    placement : "bottom",
                                    effect : "dark"
                                  },
                                  () => [
                                      h(
                                      'span',
                                      {
                                        ref : 'tooltip_' + el
                                      },
                                      [this.grid.header[el].name, h(
                                          resolveComponent('el-icon'),
                                          () => [
                                              this.grid.header[el].contentSort == 'asc' ?
                                                h(CaretTop, { class : 'vdg_rowHeader_iconSort',
                                                                    onClick : () => {this.grid.header[el].contentSort =  'desc'; this.grid.sortContent({name : el, order : 'desc' })}
                                                                  }
                                                ) : '',
                                              this.grid.header[el].contentSort == 'desc' ?
                                                h(CaretBottom, {  class : 'vdg_rowHeader_iconSort',
                                                                        onClick : () => {this.grid.header[el].contentSort = 'asc'; this.grid.sortContent({name : el, order : 'asc' })}
                                                                     }
                                                ) : ''
                                          ]
                                      )]
                                      ),
                                  ]
                              ),
                              h(
                                  'div',
                                  {
                                    class : 'vdg_rowHeader_columnHeader_handle',
                                    onMousedown: $event => this.onResizeStart($event,el),
                                  }
                              )
                            ]
                          }
                        })()
                    )
                })
            ),
          // Формируем скроллбар
          h(
            resolveComponent('el-scrollbar'),
            {
              class : 'vdg_rowHeader_scrollbar',
              ref : 'scrollBarGrid',
              always : true,
              onScroll : $event => this.scrollEvent($event)
            },
            () => [h(
                'div',
                {
                  style : {
                    width : this.grid.system.scrollWidth + 'px',
                    height : '10px'
                  },
                },
                ''
            )]
          ),
          // Диалоговое окно для отключения показа элементов
          h(
            resolveComponent('el-dialog'),
            {
              'custom-class' : 'vdg_showFieldsModal',
              'model-value' : this.dialogVisible,
              'onUpdate:modelValue': value => {this.dialogVisible = value},
              title : "Настройка списка",
              width : '30%'
            },
            () => [h(
                resolveComponent('el-scrollbar'),
                {
                  height : '400px',
                  class : 'vdg_showFieldsModal_scroll'
                },
                () => {return this.grid.system.columnShow.map(el => {
                  return h(
                      resolveComponent('el-checkbox'),
                      {
                        class : 'vdg_showFieldsModal_item',
                        'model-value' : this.grid.header[el].show,
                        'onUpdate:modelValue': async value => {
                          this.grid.header[el].show = value;
                          await nextTick();
                          this.$refs['scrollBarGrid'].update();
                          await this.saveGridSetting();
                        },
                        label : this.grid.header[el].name,
                        size : 'large'
                      },
                      ''
                  )
                })}
            )]
          )
        ]
    );
  },
  mounted() {
    // обработка изменения размера и перемещения колонки
    document.addEventListener('mousemove',async (e) => {
      if(this.resize.key){
        let width = this.resize.width + (e.clientX - this.resize.start);
        this.grid.header[this.resize.key].width = width < 80 ? 80 : width;
      }
      if(this.drag.start){
        let node = document.querySelector('.vdg_rowHeader_dragActiveElement'),
        dragLeft = e.clientX - this.drag.width,
        sort = null,
        updateKey = null;
        if(node)
          node.style.left = dragLeft + 'px';

        if(this.drag.move.back && (this.drag.move.back.rect.x + (this.drag.move.back.rect.width / 2)) > e.clientX)
          updateKey = 'back';

        if(this.drag.move.next && (this.drag.move.next.rect.x + (this.drag.move.next.rect.width / 2)) < e.clientX)
          updateKey = 'next';

        if(updateKey){
          sort = this.grid.header[this.drag.name].sort;
          this.grid.header[this.drag.name].sort = this.grid.header[this.drag.move[updateKey].key].sort;
          this.grid.header[this.drag.move[updateKey].key].sort = sort;
          await nextTick();
          this.dragGetData();
        }
      }
    })
    // Старт изменения размера и перемещения колонки
    document.addEventListener('mouseup',() => {
      if(this.drag.start){
        this.drag.start = false;
        this.drag.width = 0;
        if(document.querySelector('.vdg_rowHeader_dragActiveElement')) {
          document.querySelector('.vdg_rowHeader_dragActiveElement').remove();
          this.saveGridSetting()
        }
      }
      if(this.resize.key){
        this.$refs['scrollBarGrid'].update();
        this.resize.key = null;
        this.saveGridSetting()
      }
    })
  },
  data : () => {
    return{
      resize : {
        start : 0,
        move : 0,
        width : 0,
        key : null
      },
      drag : {
        name  : null,
        start : false,
        width : 0,
        move : {
          back : null,
          this : null,
          next : null,
        }
      },
      dialogVisible : false
    }
  },
  methods : {
    onResizeStart (e,el){
      e.preventDefault();
      this.resize.key = el;
      this.resize.start = e.clientX;
      this.resize.width = this.grid.header[el].width;
    },
    dragGetData(){
      let startIndex = this.grid.system.columnKey.indexOf(this.drag.name);
      this.drag.move.this = {};
      this.drag.move.this.key = this.grid.system.columnKey[startIndex];
      this.drag.move.this.rect = this.$refs['drag_' + this.drag.move.this.key].getBoundingClientRect();

      if(startIndex === 0)
        this.drag.move.back = null
      else{
        this.drag.move.back = {};
        this.drag.move.back.key = this.grid.system.columnKey[startIndex - 1];
        this.drag.move.back.rect = this.$refs['drag_' + this.drag.move.back.key].getBoundingClientRect();
      }

      startIndex++;

      if(startIndex === this.grid.system.columnKey.length)
        this.drag.move.next = null
      else{
        this.drag.move.next = {};
        this.drag.move.next.key = this.grid.system.columnKey[startIndex];
        this.drag.move.next.rect = this.$refs['drag_' + this.drag.move.next.key].getBoundingClientRect();
      }
    },
    tooltip(item){
      let flag = true;
      if(this.$refs['tooltip_' + item]){
        if(this.$refs['tooltip_' + item].clientWidth < this.$refs['tooltip_' + item].scrollWidth)
          flag = false
      }
      return flag;
    },
    scrollEvent({scrollLeft}){
      let header = document.querySelector('.vdg_rowHeader.' + this.name);
      header.scrollLeft = scrollLeft;

      let content = document.querySelector('.vdg_contentWrapper.' + this.name);
      content.style.clipPath = 'inset(0 ' + (this.grid.system.scrollWidth - header.clientWidth - scrollLeft + 15) + 'px 0 '+scrollLeft+'px)';
      content.style.left = -scrollLeft+'px';
      content.style.width = this.grid.system.scrollWidth+'px';
    },
    onDragStart(e,item){
      e.preventDefault();
      if(!this.resize.key)
        this.drag.start = true;
      setTimeout(() => {
        if (this.drag.start){
          let node = document.createElement('div');
          this.drag.name = item;
          this.dragGetData();
          this.drag.width = (this.grid.header[item].width / 2);
          node.classList.add('vdg_rowHeader_dragActiveElement', 'vdg_rowHeader_columnHeader');
          node.append(this.grid.header[item].name)
          node.style.left = (e.clientX - this.drag.width) + 'px';
          node.style.top = this.drag.move.this.rect.y + 'px';
          node.style.width = this.grid.header[item].width + 'px';
          document.body.append(node);
        }
      },200)

    },
    async saveGridSetting(){
      //все поля шапки отправлять на бэк не надо... ниже выберем только нужные
      let dataToSend = {};
      for (const [key, value] of Object.entries(this.grid.header)) {
        dataToSend[key] = {
          show : value.show,
          sort : value.sort,
          width : value.width,
        }
      }
      let result = await this.grid.loadJson('/grid/setting/add', {
        grid_id : this.grid.gridId,
        data    : dataToSend,
      });

      this.$notify({
        title                     : 'Сохранение настроек таблицы',
        message                   : result.message,
        type                      : result.status,
        dangerouslyUseHTMLString  : true,
        duration                  : 5000,
        showClose                 : true
      });
    },
  }
}
</script>