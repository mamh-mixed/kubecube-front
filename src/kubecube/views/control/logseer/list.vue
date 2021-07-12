<template>
  <u-linear-layout direction="vertical">
    <u-linear-layout direction="horizontal">
      <u-button
        icon="create"
        color="primary"
        @click="toCreate"
      >
        创建日志任务
      </u-button>
      <u-button
        icon="refresh"
        square
        @click="refresh"
      />
      <kube-input-search
        :align-right="true"
        placeholder="请输入名称搜索"
        @search="onSearch"
      />
    </u-linear-layout>

    <x-request
      ref="request"
      :service="service"
      :params="requestParam"
      :processor="resolver"
    >
      <template slot-scope="{ data, loading, error }">
        <kube-table
          table-width="100%"
          :loading="loading"
          :columns="columns"
          :items="data ? data.list : []"
          :error="error"
          @sort="onSort"
        >
          <template #[`item.metadata.name`]="{ item }">
            <u-link :to="{path: `/control/${workload}/${item.metadata.name}`}">
              {{ item.metadata.name }}
            </u-link>
          </template>
          <template #[`item.type`]="{ item }">
            {{ item.type | logType }}
          </template>
          <template #[`item.path`]="{ item }">
            {{ getPaths(item.inputs) }}
          </template>

          <template #[`item.metadata.creationTimestamp`]="{ item }">
            {{ item.metadata.creationTimestamp | formatLocaleTime }}
          </template>
          <template #[`item.operation`]="{ item }">
            <u-linear-layout gap="small">
              <u-link-list :key="workload">
                <u-link-list-item @click="editItem(item)">
                  设置
                </u-link-list-item>
                <u-link-list-item @click="deleteItem(item)">
                  删除
                </u-link-list-item>
              </u-link-list>
            </u-linear-layout>
          </template>
          <template #noData>
            <template v-if="pagenation.selector">
              没有搜索到相关内容，可调整关键词重新搜索
            </template>
            <template v-else>
              还没有任何 日志任务
            </template>
          </template>
        </kube-table>
        <u-page
          v-if="data && calculatePages(data.total) > 1"
          :count="data.total"
          :page-size="pagenation.pageSize"
          :total="calculatePages(data.total)"
          @select="selectPage"
        />
      </template>
    </x-request>
  </u-linear-layout>
</template>

<script>
import { pickBy, flatten } from 'lodash';
import { get } from 'vuex-pathify';
import workloadService from 'kubecube/services/k8s-resource';
import PageMixin from 'kubecube/mixins/pagenation';
import {
    toPlainObject as toLogconfgPlainObject,
} from 'kubecube/k8s-resources/logconfigs';
import {
    PVC_MODE_TEXT_MAP,
} from 'kubecube/utils/constance';
import { LOG_TYPE } from 'kubecube/utils/constance';

export default {
    metaInfo: {
        title: 'kubecube',
        titleTemplate: '日志任务管理 - %s',
    },
    filters: {
        logType(val) {
            return LOG_TYPE[val];
        },
        accessModeFilter(val) {
            return val[0] ? PVC_MODE_TEXT_MAP[val[0]] : '-';
        },
    },
    mixins: [ PageMixin ],
    computed: {
        namespace: get('scope/namespace@value'),
        cluster: get('scope/cluster@value'),
        service() {
            return workloadService.getNeteaseResource;
        },
        instanceService() {
            return workloadService.getNeteaseResourceInstance;

        },
        modifyService() {
            return workloadService.modifyNeteaseResource;
        },
        deleteService() {
            return workloadService.deleteNeteaseResource;
        },
        columns() {
            return [
                { title: '日志任务名称', name: 'metadata.name', sortable: true, textwrap: true },
                { title: '日志源类型', name: 'type', width: '120px' },
                { title: '标签选择器', name: 'metadata.labels', width: '180px', type: 'tag', cellprops: {
                    formatter(item) { return `${item.key}=${item.value}`; },
                } },
                { title: '日志路径', name: 'path', width: '200px', textwrap: true },
                { title: '创建时间', name: 'metadata.creationTimestamp', width: '180px' },
                { title: '操作', name: 'operation', width: '160px' },
            ];

        },
        requestParam() {
            return {
                pathParams: {
                    cluster: this.cluster,
                    namespace: this.namespace,
                    resource: this.workload,
                },
                params: {
                    ...pickBy(this.pagenation, i => !!i), // has to be this
                },
            };
        },
        workload() {
            return this.$route.params.workload;
        },
    },
    watch: {
        columns() {
            this.$refs.request.resetData();
        },
    },
    methods: {
        resolver(response) {
            const list = (response.items || []).map(toLogconfgPlainObject);
            return {
                list,
                total: response.total,
            };
        },
        refresh() {
            this.$refs.request.request();
        },
        onSort({ order, name }) {
            this.pagenation.sortOrder = order;
            this.pagenation.sortName = `${name}`;
            this.pagenation.sortFunc = name === 'creationTimestamp' ? 'time' : 'string';
        },
        onSearch(content) {
            this.pagenation.selector = content ? `metadata.name~${content}` : undefined;
        },
        toCreate() {
            this.$router.push({ name: 'control.workload.create', params: this.$route.params });
        },
        getPaths(inputs) {
            return flatten(inputs.map(p => p.paths.map(t => t.path))).join(',') || '-';
        },
        editItem(item) {
            this.$router.push({
                path: `/control/${this.workload}/${item.metadata.name}/edit`,
            });
        },
        deleteItem(item) {
            this.$confirm({
                title: '删除',
                content: `确认要删除 ${item.metadata.name} 吗？`,
                ok: async () => {
                    const reqParam = {
                        pathParams: {
                            cluster: this.cluster,
                            namespace: this.namespace,
                            resource: this.workload,
                            name: item.metadata.name,
                        },
                    };
                    await this.deleteService(reqParam);
                    this.$refs.request.request();
                },
            });
        },
    },
};
</script>

<style>

</style>