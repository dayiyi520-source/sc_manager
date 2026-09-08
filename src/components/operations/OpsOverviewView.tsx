import React, { useState } from 'react';
import {
  Server,
  Activity,
  Cpu,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  RefreshCw,
  Zap,
  Radio,
  Terminal,
  Layers,
  BarChart3,
  Search,
  ExternalLink,
  ChevronRight
} from '@/components/common/octicons-compat';
import { useApp } from '../../context/AppContext';
import { StatCard, StatusTag, Modal } from '../common/UIComponents';
import { ServerNode } from '../../types';

export const OpsOverviewView: React.FC = () => {
  const { servers, setServers, addToast, openPageTab } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedServer, setSelectedServer] = useState<ServerNode | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const healthyCount = servers.filter((s) => s.status === 'healthy').length;
  const warningCount = servers.filter((s) => s.status === 'warning').length;
  const errorCount = servers.filter((s) => s.status === 'error').length;

  const filteredServers = servers.filter((s) => {
    return (
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.ip.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.role.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleRefreshMetrics = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setServers((prev) =>
        prev.map((s) => ({
          ...s,
          cpuUsage: Math.min(95, Math.max(15, s.cpuUsage + Math.floor((Math.random() - 0.5) * 12))),
          memoryUsage: Math.min(96, Math.max(30, s.memoryUsage + Math.floor((Math.random() - 0.5) * 8)))
        }))
      );
      setIsRefreshing(false);
      addToast('success', '基础设施节点指标已刷新', 'Prometheus采集集群指标同步完成');
    }, 600);
  };

  const handleRestartNode = (node: ServerNode) => {
    addToast('info', `正在重启服务节点: ${node.name}`, '优雅平滑摘除流量并执行Rolling Restart...');
    setTimeout(() => {
      addToast('success', `节点 ${node.name} 重启完成并重新挂载入集群`);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Top Infrastructure Health Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="集群健康度"
          value="99.98%"
          subText="连续稳定运行 180 天"
          icon={<ShieldCheck className="w-5 h-5" />}
          iconBgColor="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
        />
        <StatCard
          title="运行中服务器节点"
          value={`${healthyCount}/${servers.length}`}
          subText={`${warningCount > 0 ? `${warningCount} 节点高负载告警` : '全节点负载健康'}`}
          icon={<Server className="w-5 h-5" />}
          iconBgColor="bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20"
        />
        <StatCard
          title="集群平均CPU负载"
          value="48.2%"
          subText="峰值波动正常"
          icon={<Cpu className="w-5 h-5" />}
          iconBgColor="bg-sky-500/10 text-sky-400 border border-sky-500/20"
        />
        <StatCard
          title="平均响应延迟 (P99)"
          value="18.6 ms"
          subText="国网专网专线接入"
          icon={<Zap className="w-5 h-5" />}
          iconBgColor="bg-purple-500/10 text-purple-400 border border-purple-500/20"
        />
      </div>

      {/* Main Node Topology & Monitoring */}
      <div className="bg-[#141417] border border-[#1E1E22] rounded-lg p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1E1E22] pb-4">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-[#C5A059]" />
              生产环境核心集群拓扑与节点监控
            </h3>
            <p className="text-xs text-[#8E8E93] mt-0.5">
              实时监控网关服务、核心业务微服务、达梦数据库集群与分布式Redis缓存
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleRefreshMetrics}
              disabled={isRefreshing}
              className="px-3.5 py-1.5 bg-[#1E1E22] hover:bg-[#2A2A30] text-[#D1D1D1] border border-[#2A2A30] rounded-md text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              采集最新指标
            </button>
            <button
              onClick={() => openPageTab('ops_milestones')}
              className="px-3.5 py-1.5 bg-[#C5A059] text-black hover:bg-[#D6B26A] font-semibold rounded-md text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            >
              查看里程碑计划
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="按节点主机名、IP地址、服务角色搜索..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#0F0F11] border border-[#1E1E22] rounded-md text-xs text-white placeholder-[#71717A] focus:outline-hidden focus:border-[#C5A059]"
            />
          </div>
        </div>

        {/* Node Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
          {filteredServers.map((server) => {
            const isHighCpu = server.cpuUsage >= 80;
            const isHighMem = server.memoryUsage >= 80;

            return (
              <div
                key={server.id}
                onClick={() => setSelectedServer(server)}
                className={`p-4 rounded-lg bg-[#0F0F11] border transition-all cursor-pointer group ${
                  server.status === 'warning'
                    ? 'border-amber-500/40 bg-amber-500/5 hover:border-amber-500/70'
                    : server.status === 'error'
                    ? 'border-rose-500/40 bg-rose-500/5 hover:border-rose-500/70'
                    : 'border-[#1E1E22] hover:border-[#C5A059]/40 hover:bg-[#16161A]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-mono font-semibold text-white text-xs group-hover:text-[#C5A059] transition-colors flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          server.status === 'healthy'
                            ? 'bg-emerald-400'
                            : server.status === 'warning'
                            ? 'bg-amber-400 animate-ping'
                            : 'bg-rose-400'
                        }`}
                      />
                      {server.name}
                    </div>
                    <div className="text-[11px] text-[#8E8E93] font-mono mt-0.5">
                      {server.ip}:{server.port}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-[#1E1E22] border border-[#2A2A30] text-[#D1D1D1] rounded text-[10px]">
                    {server.role}
                  </span>
                </div>

                {/* Performance Meters */}
                <div className="mt-4 space-y-2.5">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-[#8E8E93] flex items-center gap-1">
                        <Cpu className="w-3 h-3 text-[#71717A]" /> CPU 负载
                      </span>
                      <span
                        className={`font-mono font-semibold ${
                          isHighCpu ? 'text-amber-400' : 'text-white'
                        }`}
                      >
                        {server.cpuUsage}%
                      </span>
                    </div>
                    <div className="w-full bg-[#1E1E22] h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isHighCpu ? 'bg-amber-400' : 'bg-[#C5A059]'
                        }`}
                        style={{ width: `${server.cpuUsage}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-[#8E8E93] flex items-center gap-1">
                        <HardDrive className="w-3 h-3 text-[#71717A]" /> 内存占用
                      </span>
                      <span
                        className={`font-mono font-semibold ${
                          isHighMem ? 'text-amber-400' : 'text-white'
                        }`}
                      >
                        {server.memoryUsage}%
                      </span>
                    </div>
                    <div className="w-full bg-[#1E1E22] h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isHighMem ? 'bg-amber-400' : 'bg-sky-400'
                        }`}
                        style={{ width: `${server.memoryUsage}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-3.5 pt-2.5 border-t border-[#1E1E22] flex items-center justify-between text-[10px] text-[#71717A]">
                  <span>持续运行: {server.uptime}</span>
                  <span className="text-[#C5A059] group-hover:underline">节点详情 &gt;</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Node Detail Modal */}
      {selectedServer && (
        <Modal
          isOpen={!!selectedServer}
          onClose={() => setSelectedServer(null)}
          title={`节点详情: ${selectedServer.name}`}
          subtitle={`${selectedServer.ip}:${selectedServer.port} (${selectedServer.role})`}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-[#0F0F11] border border-[#1E1E22] rounded">
                <div className="text-[11px] text-[#8E8E93]">当前状态</div>
                <div className="font-semibold text-emerald-400 mt-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 运行健康 (Healthy)
                </div>
              </div>
              <div className="p-3 bg-[#0F0F11] border border-[#1E1E22] rounded">
                <div className="text-[11px] text-[#8E8E93]">连续运行时长</div>
                <div className="font-mono font-semibold text-white mt-1">
                  {selectedServer.uptime}
                </div>
              </div>
            </div>

            <div className="p-3 bg-[#0F0F11] border border-[#1E1E22] rounded space-y-2">
              <div className="font-semibold text-white">Prometheus监控项</div>
              <div className="space-y-1.5 font-mono text-[11px] text-[#8E8E93]">
                <div className="flex justify-between">
                  <span>node_cpu_utilization:</span>
                  <span className="text-white">{selectedServer.cpuUsage}%</span>
                </div>
                <div className="flex justify-between">
                  <span>node_memory_utilization:</span>
                  <span className="text-white">{selectedServer.memoryUsage}%</span>
                </div>
                <div className="flex justify-between">
                  <span>node_disk_usage:</span>
                  <span className="text-white">{selectedServer.diskUsage}%</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSelectedServer(null)}
                className="px-3.5 py-1.5 bg-[#1E1E22] hover:bg-[#2A2A30] text-[#D1D1D1] rounded-md text-xs"
              >
                关闭
              </button>
              <button
                type="button"
                onClick={() => {
                  handleRestartNode(selectedServer);
                  setSelectedServer(null);
                }}
                className="px-4 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-medium rounded-md text-xs transition-colors"
              >
                平滑滚动重启
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
