<script>
import Column from "@/vdg3/components/column";
import HeaderRow from "@/vdg3/components/header";
import Filterable from "@/vdg3/components/filterable";
import {Fragment, h, Teleport, inject, resolveComponent} from "vue";

export default {
  components: {Column,HeaderRow, Filterable},
  name : 'Grid',
  props : ['name'],
  emits : ['gridReady'],
  setup(props, context){
    let grid = inject(props.name);
    async function getGridData(){
      grid.loading = true
      //ниже получили gridID
       let result = await grid.loadJson('/grid/home', {
        name     : props.name,
        user_id  : grid.networkSetting.userId,
        module   : grid.networkSetting.module,
      });
      if (result.status == 'success') grid.gridId = result.grid_id;

      // ниже запросили настройки таблицы
      result = await grid.loadJson('/grid/setting/get', {
        grid_id : grid.gridId,
      });
      if (result.status == 'success'){
        for (const [key, value] of Object.entries(result.data)) {
          grid.header[key].show = value.show;
          grid.header[key].sort = value.sort;
          grid.header[key].width = value.width;
        }
      }

      // ниже работаем с данными для фильтра
      let defaultFilterData = {};
      result = await grid.loadJson('/grid/filter/preset/default/get', {
        grid_name : props.name,
        module    : grid.networkSetting.module,
      });
      if (result.status == 'success') {
        for (let key in result.data) {
          result.data[key].show = true;
          result.data[key].query ? result.data[key].query = eval('(' + result.data[key].query + ')') : '';
        }
        defaultFilterData = result.data
        grid.methods.normalizeFilterData(defaultFilterData);
      }

      if (grid.filter.showProfiles) {
        grid.filter.profiles.push({name: 'По умолчанию', data: defaultFilterData});

        //ниже создать аналог defaultFilterData, но только везде сделать show = false и потом будем эти данные добавлять к пользовательским профилям
        //таким образом пользователь сможет создавать из своих профилей другие профили и возможно изменять существующие
        let extentData = {};
        for (const [key, value] of Object.entries(defaultFilterData)) {
          extentData[key] = {...value, ...{show: false}}
        }

        let profiles = await grid.loadJson('/grid/filter/preset/list', {
          grid_id : grid.gridId,
        });

        if (profiles.status == 'success'){
          profiles.data.forEach(el => {
            //ниже вернуть всем show = true
            for (const [key, value] of Object.entries(el.data)) {
              el.data[key].show = true;
            };
            //ниже срастить поля фильтра полученные с бэка с полями фильтра которые не были на бэке, но есть в дефолтовом профиле и имееют show = false, чтоб потом пользователь мог менять профиль и добавлять новые поля
            grid.filter.profiles.push(
                {
                  name : el.name,
                  id   : el.id,
                  data : {
                    ...extentData,
                    ...el.data,
                  }
                }
            );
          })
        }//if success
      };//если есть профили
      grid.loading = false;
      context.emit("gridReady");
    };
    getGridData();

    return {grid}
  },

  render(){
    let pagination = h(
        resolveComponent('el-pagination'),
        {
          total: this.grid.pagination.total,
          layout: this.grid.pagination.layout.join(','),
          pagerCount: this.grid.pagination.pagerCount,
          currentPage: this.grid.pagination.page,
          'onUpdate:currentPage': value => {
            this.grid.pagination.page = value
          },
          pageSize: this.grid.pagination.defaultSize,
          'onUpdate:pageSize': value => {
            this.grid.pagination.defaultSize = value
          },
          pageSizes: this.grid.pagination.sizes,
          onSizeChange: this.grid.pagination.changeSize,
          onCurrentChange: this.grid.pagination.changePage
        }
    )

    return h(
        Fragment,
        {},
        [

            h('div',{class : ['vdg_paginationWrapper', this.name]},[
              h(Filterable, {name : this.name}),
              (this.grid.pagination.show == 'full' || this.grid.pagination.show == 'top') ? pagination : null,

              // (() => {
              //       if (this.grid.pagination.show == 'full' || this.grid.pagination.show == 'top')
              //         return pagination;
              //     })()

              ]
            ),

          h(HeaderRow,{name : this.name}),

          h(Column,{name : this.name}),

          // Формирует контекстное меню если есть меню элемента берет его если нет общее
          this.grid.system.context.show ? h(
              Teleport,
              {to : "body"},
              h(
                  'div',
                  {
                    class : ['vdg_contextMenuWrapper',this.name],
                    style : {
                      top : this.grid.system.context.top + 'px',
                      left : this.grid.system.context.left + 'px',
                    },
                  },
                  this.grid.system.context.row.context ? this.grid.system.context.row.context.map(el => {
                        return h(
                            'div',
                            {
                              class : 'vdg_contextMenuWrapper_item',
                               onClick : $event => {
                                 el.function($event,this.grid.system.context)
                                 this.grid.system.context.show = false;
                               }
                            },
                            el.text
                        )
                   }) : this.grid.context.map(el => {
                    return h(
                        'div',
                        {
                          class : 'vdg_contextMenuWrapper_item',
                          onClick : $event => {
                            el.function($event,this.grid.system.context)
                            this.grid.system.context.show = false;
                          }
                        },
                        el.text
                    )
                  })
              )
          ) : '',

          h('div',{class : ['vdg_paginationWrapper', this.name]},[
               (this.grid.pagination.show == 'full' || this.grid.pagination.show == 'bottom') ? pagination : null,
                // (() => {
                //   if (this.grid.pagination.show == 'full' || this.grid.pagination.show == 'bottom')
                //     return pagination
                // })()
              ]
          ),
        ]
    )
  }

};

</script>