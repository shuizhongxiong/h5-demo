var config = {
    dom: '#treemap',
    width: 600,
    height: 440,
    data: data,
    paddingInner: 1,  // 设置兄弟节点之间的间距
    paddingOuter: 1,  // 设置父子节点之间的间距
    textThreshold: 0, // 文字阈值，占比等于小于此值的数据文字将会隐藏
    duration: 750,    // 动画时长（ms）
    colors: ['#1b9563', '#3ba673', '#23a087', '#33af88', '#44af36', '#65bba2', '#79bf22', '#ceca35', '#d5ad1e', '#b8b26a', '#cc8c27', '#a5701c'],   // 颜色配置
    toolTip: {
        style: 'min-width: 150px;'+
            'max-width: 300px;'+
            'background-color: rgba(0,0,0,.57);'+
            'color: #fff;'+
            'position: absolute;'+
            'opacity: 0;'+
            'left: 0;'+
            'top: 0;'+
            'padding: 10px;'+
            'border-radius: 5px;'+
            'pointer-events:none;',

        html: function(d){
            var ratio = 0;
            if (level === 1) {
                ratio = d.data.size || 0
            } else if (level === 2) {
                ratio = 100 / d.parent.data.size * d.value || 0
            }
            var tip = '手机品牌：'+ d.data.name +'<br>'
                    + '占比：'+ ratio.toFixed(2) +'%';
            return tip;
        }
    }
}

var level = 1;
var isInChange = false;
var levelData = {};
var color = d3.scaleOrdinal(config.colors);

function getRoot(data){
    var root = d3.hierarchy(data)
        .eachBefore(function(d){
            // 数据父层不能有value值，否则treemap后，子层的最后一个数据会出错
            if (level===1 && d.depth != 2) {
                // 备份value，提示框会用到
                d.data.size = d.data.value;
                d.data.value = 0;
            }
        })
        .sum(function(d) {
            return d.value;
        })
        .sort(function(a, b) { return b.value - a.value; });

    var treemap = d3.treemap()
        .tile(d3.treemapSquarify)
        .size([config.width, config.height])
        .paddingInner(config.paddingInner)
        .paddingOuter(config.paddingOuter)
        .round(false);
        
    return treemap(root);
}

// 添加svg
var svg = d3.selectAll(config.dom)
    .append('svg')
    .attr('width', config.width)
    .attr('height', config.height)
    .attr('font-family', 'sans-serif')
    .attr('font-size', 12)
    .attr('text-anchor', 'start')
    .style('shape-rendering', 'crispEdges')
    .style('overflow', 'hidden');

// 添加方块容器
var depth = svg.append('g')
    .attr('class', 'depth');

// 添加level方块容器
var levelDepth = svg.insert('g')
    .attr('class', 'levelDepth')
    .style('display', 'none');

// 添加一级方块
var children = depth.selectAll('.children')
    .data(getRoot(config.data).children)
    .enter()
    .append('g')
    .attr('class', 'children')
    .on('click', changeLevel);

// 添加二级方块
var child = children.selectAll('.child')
    .data(function(d){
        return d.children;
    })
    .enter()
    .append('rect')
    .attr('class', 'child')
    .attr('x', function(d) { 
        return d.x0; 
    })
    .attr('y', function(d) { 
        return d.y0; 
    })
    .attr('width', function(d) {
        return d.x1 - d.x0; 
    })
    .attr('height', function(d) { 
        return d.y1 - d.y0; 
    })
    .style('fill', function(d, i){
        return color(d.parent.data.name);
    });

// 添加一级方块浮层
var childrenCover = children.append('rect')
    .attr('class', 'childrenCover')
    .attr('x', function(d) { 
        return d.x0; 
    })
    .attr('y', function(d) { 
        return d.y0; 
    })
    .attr('width', function(d, i) {
        return d.x1 - d.x0; 
    })
    .attr('height', function(d) { 
        return d.y1 - d.y0; 
    })
    .attr('fill', 'transparent')
    .on('mousemove', tooltipShow)
    .on('mouseout', tooltipHide);


// 添加文字
var text = children.append('text')
    .attr('x', function(d){
        return d.x0 + 6
    })
    .attr('y', function(d){
        return d.y0 + 16
    })
    .text(function(d) {
        return d.data.name; 
    })
    .attr('style', function(d){
        var style = 'font-size:12px; fill: #fff;'
        if (config.textThreshold && config.textThreshold > d.data.size) {
            style += 'display: none;';
        }
        return style;
    });

// 添加提示框
var tooltip = d3.select(config.dom).append('div')  
        .attr('style', config.toolTip.style)
        .attr('opacity', 0);

function tooltipShow(d){
    d3.select(this).attr('fill', 'rgba(0,0,0,0.3)');
    tooltip
        .html(config.toolTip.html(d))
        .style('left',(d3.event.layerX)+'px')  
        .style('top',(d3.event.layerY+20)+'px')
        .style('opacity', 1);
}
function tooltipHide(d){
    if (this.nodeType === 1) {
        d3.select(this).attr('fill', 'transparent');
    }

    tooltip.style('opacity', 0);
}

// 层级切换
function changeLevel(d, i, e){

    if (isInChange) {
        return;
    }
    isInChange = true;

    var data = config.data.children[i],
        levelNode = d3.selectAll('.children').nodes()[i],
        levelNodeW = d3.select(levelNode).select('.childrenCover').attr('width'),
        levelNodeH = d3.select(levelNode).select('.childrenCover').attr('height');

    if (level === 1) {
        level = 2;

        levelDepth.selectAll('.children1').remove();

        // 添加方块
        var children1 = levelDepth.selectAll('.children1')
            .data(getRoot(data).children)
            .enter()
            .append('g')
            .attr('class', 'children1')
            .on('click', changeLevel);

        children1.append('rect')
            .attr('class', 'child1')
            .attr('x', function(d) { 
                return d.x0; 
            })
            .attr('y', function(d) { 
                return d.y0; 
            })
            .attr('width', function(d) {
                return d.x1 - d.x0; 
            })
            .attr('height', function(d) { 
                return d.y1 - d.y0; 
            })
            .style('fill', function(d, i){
                return color(d.parent.data.name);
            });

        // 添加浮层
        var child1Cover = children1.append('rect')
            .attr('class', 'child1Cover')
            .attr('x', function(d) { 
                return d.x0; 
            })
            .attr('y', function(d) { 
                return d.y0; 
            })
            .attr('width', function(d, i) {
                return d.x1 - d.x0; 
            })
            .attr('height', function(d) { 
                return d.y1 - d.y0; 
            })
            .attr('fill', 'transparent')
            .on('mousemove', tooltipShow)
            .on('mouseout', tooltipHide);

        // 添加文字
        children1.append('text')
            .attr('x', function(d) { 
                return d.x0 + 6;
            })
            .attr('y', function(d) { 
                return d.y0 + 16;
            })
            .text(function(d) {
                return d.data.name; 
            })
            .attr('style', function(d){
                var style = 'font-size:12px; fill: #fff;'
                if (config.textThreshold && config.textThreshold > (100 / d.parent.data.size * d.value)) {
                    style += 'display: none;';
                }
                return style;
            });

        levelData.levelDepthScaleX = levelNodeW / config.width,
        levelData.levelDepthScaleY = levelNodeH / config.height,
        levelData.levelDepthTranslateX = d.x0 / levelData.levelDepthScaleX,
        levelData.levelDepthTranslateY = d.y0 / levelData.levelDepthScaleY;
        levelDepth
            .attr('transform', 'scale('+ levelData.levelDepthScaleX  +','+ levelData.levelDepthScaleY +') translate('+ levelData.levelDepthTranslateX +','+ levelData.levelDepthTranslateY + ')');

        var depthScaleX = (config.width+6)/levelNodeW,
            depthScaleY = (config.height+6)/levelNodeH,
            depthTranslateX = -d.x0-1,
            depthTranslateY = -d.y0-1; 

        levelDepth
            .style('display', 'block')
            .transition()
            .delay(100)
            .duration(config.duration)
            .attr('transform', 'scale(1,1) translate(0,0)')
            .on('start', function(){
                tooltipHide();
                d3.select(levelNode)
                    .attr('display', 'none')
                    .select('text').style('display', 'none');
                levelData.levelNode = levelNode;

                depth
                    .transition()
                    .duration(config.duration)
                    .attr('transform', 'scale('+ depthScaleX  +','+ depthScaleY +') translate('+ depthTranslateX + ','+ depthTranslateY +')')
            })
            .on('end', function(){
                depth.style('display', 'none');
                isInChange = false;
            });
    } else if (level === 2) {
        level = 1;

        levelDepth
            .transition()
            .delay(100)
            .duration(config.duration)
            .attr('transform', 'scale('+ levelData.levelDepthScaleX  +','+ levelData.levelDepthScaleY +') translate('+ levelData.levelDepthTranslateX +','+ levelData.levelDepthTranslateY + ')')
            .on('start', function(){
                tooltipHide();

                depth
                    .style('display', 'block')
                    .transition()
                    .duration(config.duration)
                    .attr('transform', 'scale(1,1) translate(0,0)')
            })
            .on('end', function(){
                d3.select(levelData.levelNode)
                    .attr('display', 'block')
                    .select('text')
                    .attr('style', function(d){
                        var style = 'font-size:12px; fill: #fff;'
                        if (config.textThreshold && config.textThreshold > d.data.size) {
                            style += 'display: none;';
                        }
                        return style;
                    });

                levelDepth.style('display', 'none');
                levelData = {};
                isInChange = false;
            });
    }
}
