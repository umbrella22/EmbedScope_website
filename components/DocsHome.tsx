import { useLang, withBase } from '@rspress/core/runtime';
import './DocsHome.css';

export function DocsHome() {
  const en = useLang() === 'en';
  const link = (route: string) => withBase(`${en ? '/en' : ''}${route}.html`);
  const routes = en ? [
    ['01', 'Observe the running system', 'Read structured logs, track memory and frame timing, and retrieve crash summaries from one connection.', 'Logs and metrics', '/guide/basic/logs-metrics'],
    ['02', 'Connect pixels to UI structure', 'Inspect object geometry beside a captured frame. Select a control, send a tap, and observe the response.', 'Open the Inspector', '/guide/basic/inspector'],
    ['03', 'Fit your firmware', 'Add an allocation-free no_std Agent to your firmware. Connect it to your transport, scheduler, and device capabilities.', 'Integrate the Agent', '/integration/rust'],
  ] : [
    ['01', '读取运行现场', '通过同一条连接查看结构化日志、跟踪内存与帧耗时，并读取设备保存的崩溃摘要。', '查看日志与指标', '/guide/basic/logs-metrics'],
    ['02', '从像素找到 UI 结构', '在屏幕截图旁检查对象与几何属性，选择控件、发送触摸输入，观察界面响应。', '打开 Inspector', '/guide/basic/inspector'],
    ['03', '适配自己的固件', '将无需堆分配的 no_std Agent 接入固件，复用现有传输和任务调度，按需提供设备能力。', '接入 Rust Agent', '/integration/rust'],
  ];
  return <main className="scope-home">
    <section className="scope-hero" aria-labelledby="scope-title">
      <div className="scope-hero__copy">
        <p className="scope-eyebrow"><span>E/S</span> EMBEDDED DIAGNOSTICS & CONTROL</p>
        <h1 id="scope-title">{en ? <>See your device.<br /><em>Read its runtime.</em></> : <>看见设备，<br /><em>读懂运行现场。</em></>}</h1>
        <p className="scope-hero__lead">{en ? 'Rust tools for logs, metrics, UI inspection and display capture. Start a session from the terminal, or explore it in the desktop Inspector.' : '用 Rust 构建的嵌入式诊断工具。在命令行读取日志、指标、UI 树和屏幕，也可通过桌面 Inspector 检查界面、发送输入。'}</p>
        <div className="scope-actions">
          <a className="scope-button" href={link('/guide/start/quick-start')}>{en ? 'Get started' : '快速开始'}<span aria-hidden="true">→</span></a>
          <a className="scope-text-link" href={link('/integration/rust')}>{en ? 'Connect your firmware' : '接入设备'}<span aria-hidden="true">↗</span></a>
        </div>
        <p className="scope-hero__detail">Rust / no_std Agent <span aria-hidden="true">·</span> TCP + Serial <span aria-hidden="true">·</span> CLI + Desktop</p>
      </div>
      <figure className="scope-instrument">
        <div className="scope-instrument__heading"><span>01 / REFERENCE DEVICE</span><span>320 × 240</span></div>
        <div className="scope-instrument__screen"><img src={withBase('/images/reference-capture.png')} width="320" height="240" alt={en ? 'Actual capture from the software reference device showing counter 1 and a tap button' : '软件参考设备的实际捕获：计数为 1，按钮为 TAP TO INCREMENT'} fetchPriority="high" /></div>
        <div className="scope-instrument__readout"><code>$ escope -d tcp://127.0.0.1:9337 input tap 100 140</code><div><span>COUNTER <b>0 → 1</b></span><span>FRAME <b>1 → 2</b></span></div></div>
        <figcaption><span className="scope-dot" />{en ? 'Software / synthetic · captured with escope' : '软件参考设备 · synthetic · 使用 escope 捕获'}</figcaption>
      </figure>
    </section>

    <section className="scope-session" aria-labelledby="session-title">
      <div><span className="scope-label">FIRST CONNECTION</span><h2 id="session-title">{en ? 'One device. One session.' : '一个设备，一个会话。'}</h2><p>{en ? 'Explore logs, captures and input with the local reference device.' : '在本机启动参考设备，体验日志采集、屏幕捕获与触摸交互。'}</p></div>
      <div className="scope-terminal" aria-label={en ? 'Quick start commands' : '快速开始命令'}><div><span>TERMINAL 01</span><code>escope simulate</code></div><div><span>TERMINAL 02</span><code>escope -d tcp://127.0.0.1:9337 info</code><code>escope -d tcp://127.0.0.1:9337 ui tree</code></div></div>
    </section>

    <section className="scope-workflows" aria-labelledby="workflow-title">
      <div className="scope-section-heading"><span className="scope-label">THE WORKFLOW</span><h2 id="workflow-title">{en ? 'From a signal to an explanation.' : '从一条信号，找到问题的线索。'}</h2></div>
      {routes.map(([number, title, description, action, route]) => <article className="scope-workflow" key={number}><span className="scope-workflow__number">{number}</span><h3>{title}</h3><div><p>{description}</p><a className="scope-text-link" href={link(route)}>{action}<span aria-hidden="true">→</span></a></div></article>)}
    </section>

    <section className="scope-handoff" aria-labelledby="handoff-title"><div><span className="scope-label">WORK WITH YOUR AGENT</span><h2 id="handoff-title">{en ? 'Debug with your coding assistant.' : '与编码助手一起调试。'}</h2><p>{en ? 'Use two skills to collect device data, reproduce issues, or integrate the Agent into firmware through the public CLI and APIs.' : '通过两份 skills，让编码助手采集设备数据、复现问题，或使用公开接口完成固件接入。'}</p><a className="scope-text-link" href={link('/guide/advanced/skills')}>{en ? 'Install the skills' : '安装与使用 skills'}<span aria-hidden="true">→</span></a></div><div className="scope-skills"><code>$embedscope-debug</code><span>{en ? 'Collect, reproduce, explain' : '采集 · 复现 · 分析'}</span><code>$embedscope-integrate</code><span>{en ? 'Connect, configure, test' : '接入 · 配置 · 测试'}</span></div></section>
    <p className="scope-home__footnote">{en ? 'EmbedScope 0.1.0 · Rust host tools and a no_std device Agent.' : 'EmbedScope 0.1.0 · Rust 主机工具与 no_std 设备 Agent。'} <a href={link('/development/testing')}>{en ? 'Build and test' : '构建与测试'} <span aria-hidden="true">↗</span></a></p>
  </main>;
}
