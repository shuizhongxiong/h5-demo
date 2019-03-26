var config = { // 基本配置
  dom: '#bubble', // 绑定的dom元素
  width: 1000, // svg宽
  height: 400, // svg高
  data: data, // 数据
  sizeRange: [30, 50], // 气泡大小
  space: 20, // 气泡间距
  strength: [0.1, 0.2], // 拉扯作用力[x轴，y轴]，值越大，该轴方向布局越松散
  repulsive: [1, 170], // 排斥力倍数[其他球，对比球]，其他球基数为1，对比求基数为其半径
  alphaDecay: 0.03, // alpha衰减系数，值越小，则仿真过程越长，最终的效果也就越好，注意如果值过小怎会引起抖动
  alphaTarget: 0.1, // alpha目标值
  stopTimer: 600, // 强制停止力布局计算，防止抖动，0为不停止，永久运动
  colors: [], // 气泡颜色配置
  textStyle: 'font-family:sans-serif;font-size: 12px;', // 文字样式配置
  myNode: { // 对比气泡配置
    r: 30, // 半径
    x: 0, // x轴位置
    y: 0, // y轴位置
    color: 'red', // 颜色
    name: '我', // 文字
    opacity: 0.65, // 透明度
    textStyle: 'font-family:sans-serif;font-size: 12px;' // 文字样式配置
  },
  toolTip: {
    style: 'min-width: 150px;' +
      'max-width: 300px;' +
      'background-color: rgba(0,0,0,.57);' +
      'color: #fff;' +
      'position: absolute;' +
      'opacity: 0;' +
      'left: 0;' +
      'top: 0;' +
      'padding: 10px;' +
      'border-radius: 5px;' +
      'pointer-events:none;',
    html: function(d) {
      var tip = d.name + ':' +
        d.value + '<br>' +
        config.myNode.name + ':' +
        d.myValue + '<br>' +
        '相似度：' + ((d.myValue / d.value) * 100).toFixed(2) + '%';
      return tip;
    }
  }
}

// 颜色生成器
var color = d3.scaleOrdinal(d3.schemeCategory20c);
// 最大最小值
var dataMax = d3.max(config.data.children, function(d) {
  return d.value;
});
var dataMin = d3.min(config.data.children, function(d) {
  return d.value;
});
// 比例尺
var radiusScale = d3.scaleSqrt()
  .domain([dataMin, dataMax])
  .range([config.sizeRange[0], config.sizeRange[1]]);
// 力布局
var simulation = d3.forceSimulation()
  .force('collide', d3.forceCollide(function(d) {
    return radiusScale(d.value) + config.space
  }).iterations(1))
  .force('many-body', d3.forceManyBody().strength(-(config.repulsive[0])))
  .force('center', d3.forceCenter(config.width / 2, config.height / 2))
  .force('x', d3.forceX().strength(config.strength[0]))
  .force('y', d3.forceY().strength(config.strength[1]));
// 自动触发
var fireEvent = function(element, event) {
  if (document.createEventObject) {
    var evt = document.createEventObject();
    return element.fireEvent('on' + event, evt)
  } else {
    var evt = document.createEvent('HTMLEvents');
    evt.initEvent(event, true, true);
    return !element.dispatchEvent(evt);
  }
};

// 添加svg
var svg = d3.selectAll(config.dom)
  .append('svg')
  .attr('width', config.width)
  .attr('height', config.height)
  .attr('text-anchor', 'middle')

// 添加气泡容器
var circles = svg.selectAll('.circles')
  .data(config.data.children)
  .enter()
  .append('g')
  .attr('class', 'circles');

// 添加气泡
var circle = circles.append('circle')
  .data(config.data.children)
  .attr('r', function(d) {
    return radiusScale(d.value);
  })
  .style('fill', function(d, i) {
    var colorLen = config.colors.length;
    if (colorLen > 0) {
      if (i > colorLen) {
        finalColor = config.colors[i % colorLen];
      } else {
        finalColor = config.colors[i];
      }
    } else {
      finalColor = color(d.name);
    }
    return finalColor;
  })
  .attr('title', function(d) {
    return d.name;
  });
// 添加气泡文字
var text = circles.append('text')
  .text(function(d) {
    return d.name;
  })
  .attr('style', config.textStyle)

// 添加对比气泡
var myNode = svg.selectAll('.mynode')
  .data([config.myNode])
  .enter()
  .append('g')
  .attr('class', 'mynode')
  .attr('style', 'cursor:pointer;pointer-events:none;')
  .attr('transform', function(d) {
    return 'translate(' + config.myNode.x + ', ' + config.myNode.y + ')';
  });

myNode.append('circle')
  .attr('r', function(d) {
    return radiusScale(config.myNode.r);
  })
  .style('fill', function(d) {
    return config.myNode.color;
  })
  .style('opacity', config.myNode.opacity);

myNode.append('text')
  .text(function(d) {
    return config.myNode.name;
  })
  .attr('style', config.myNode.textStyle);

// 添加提示框
var tooltip = d3.select(config.dom).append('div')
  .attr('style', config.toolTip.style)
  .attr('opacity', 0);

// 绑定数据
simulation
  .nodes(config.data.children)
  .on('tick', ticked);

var isInit = true;

function ticked(e) {
  // 默认与最大气泡相比较
  if (isInit) {
    fireEvent(circles.nodes()[0], 'mouseenter')
  }

  circles.attr('transform', function(d) {
    return 'translate(' + d.x + ',' + d.y + ')';
  });
}

// 对比
circles.on('mouseenter', control);
circles.on('mouseover', control);
circles.on('mouseout', function() {
  // tooltip.style('opacity', 0); 
});

var actIndex = '';

function control(d) {

  if (d3.event.type == 'mouseover') {
    isInit = false;
  }

  // 气泡排挤
  if (actIndex === '' || actIndex !== d.index) {

    simulation.force('many-body', d3.forceManyBody().strength(
      function(myD) {
        if (myD.index === d.index) {
          return -(radiusScale(d.value) * (config.repulsive[1]));
        }
        return -(config.repulsive[0]);
      }));

    simulation
      .alphaDecay(config.alphaDecay)
      .alphaTarget(config.alphaTarget)
      .restart();

    if (+config.stopTimer > 0) {
      var stopTimer = d3.timeout(function() {
        simulation.stop();
      }, config.stopTimer);
    }
  }
  actIndex = d.index;

  // 提示框
  tooltip
    .html(config.toolTip.html(d))
    .style('opacity', 0);

  // 对比气泡移动
  var met = radiusScale(d.value) * 2 / d.value * d.myValue;
  var timerCallback = function() {
    var myNodeX = d.x - radiusScale(d.value) * 2 + met;
    var myNodeY = d.y;
    myNode
      .transition()
      .duration(300)
      .ease(d3.easeLinear)
      .attr('transform', function(d) {
        return 'translate(' + myNodeX + ', ' + myNodeY + ')';
      })
      .selectAll('circle')
      .attr('r', radiusScale(d.value));

    tooltip.style('left', (d.x) + 'px')
      .style('top', (d.y) + 'px')
      .style('opacity', 1);
  };
  var timer = d3.timer(timerCallback);
}