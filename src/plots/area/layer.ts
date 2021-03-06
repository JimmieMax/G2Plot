import { deepMix, has, each } from '@antv/util';
import { registerPlotType } from '../../base/global';
import { LayerConfig } from '../../base/layer';
import ViewLayer, { ViewConfig } from '../../base/view-layer';
import { getComponent } from '../../components/factory';
import { getGeom } from '../../geoms/factory';
import {
  ElementOption,
  ICatAxis,
  ITimeAxis,
  IValueAxis,
  Label,
  GraphicStyle,
  LineStyle,
  ISliderInteractionConfig,
  IScrollbarInteractionConfig,
} from '../../interface/config';
import { extractScale } from '../../util/scale';
import responsiveMethods from './apply-responsive';
import * as EventParser from './event';
import './theme';

const GEOM_MAP = {
  area: 'area',
  line: 'line',
  point: 'point',
};

type AreaInteraction =
  | { type: 'slider'; cfg: ISliderInteractionConfig }
  | { type: 'scrollBar'; cfg: IScrollbarInteractionConfig };

export interface AreaViewConfig extends ViewConfig {
  areaStyle?: GraphicStyle | ((...args: any) => GraphicStyle);
  seriesField?: string;
  xAxis?: ICatAxis | ITimeAxis | IValueAxis;
  yAxis?: IValueAxis;
  line?: {
    visible?: boolean;
    color?: string;
    size?: number;
    style?: LineStyle;
  };
  point?: {
    visible?: boolean;
    color?: string;
    size?: number;
    shape?: string;
    style?: GraphicStyle;
  };
  smooth?: boolean;
  interactions?: AreaInteraction[];
}

export interface AreaLayerConfig extends AreaViewConfig, LayerConfig {}

export default class AreaLayer<T extends AreaLayerConfig = AreaLayerConfig> extends ViewLayer<T> {
  public static getDefaultOptions(): any {
    return deepMix({}, super.getDefaultOptions(), {
      smooth: false,
      areaStyle: {
        opacity: 0.25,
      },
      line: {
        visible: true,
        size: 2,
        style: {
          opacity: 1,
          lineJoin: 'round',
          lineCap: 'round',
        },
      },
      point: {
        visible: false,
        size: 4,
        shape: 'point',
      },
      label: {
        visible: false,
        type: 'point',
      },
      legend: {
        visible: true,
        position: 'top-left',
        wordSpacing: 4,
      },
      tooltip: {
        visible: true,
        shared: true,
        showCrosshairs: true,
        crosshairs: {
          type: 'x',
        },
        offset: 20,
      },
    });
  }

  public line: any;
  public point: any;
  public area: any;
  public type: string = 'area';

  public beforeInit() {
    super.beforeInit();
    /** 响应式图形 */
    if (this.options.responsive && this.options.padding !== 'auto') {
      this.applyResponsive('preRender');
    }
  }

  public afterRender() {
    /** 响应式 */
    if (this.options.responsive && this.options.padding !== 'auto') {
      this.applyResponsive('afterRender');
    }
    super.afterRender();
  }

  protected geometryParser(dim, type) {
    return GEOM_MAP[type];
  }

  protected scale() {
    const props = this.options;
    const scales = {};
    /** 配置x-scale */
    scales[props.xField] = {
      type: 'cat',
    };
    if (has(props, 'xAxis')) {
      extractScale(scales[props.xField], props.xAxis);
    }
    /** 配置y-scale */
    scales[props.yField] = {};
    if (has(props, 'yAxis')) {
      extractScale(scales[props.yField], props.yAxis);
    }
    this.setConfig('scales', scales);
    super.scale();
  }

  protected coord() {}

  protected addGeometry() {
    const props: any = this.options;
    const area = getGeom('area', 'main', {
      plot: this,
    });
    this.area = area;

    if (props.label) {
      this.label();
    }

    if (props.tooltip && (props.tooltip.fields || props.tooltip.formatter)) {
      this.geometryTooltip();
    }

    this.adjustArea(area);
    this.setConfig('geometry', area);

    this.addLine();

    this.addPoint();
  }

  protected adjustArea(area: ElementOption) {
    return;
  }

  protected adjustLine(line: ElementOption) {
    return;
  }

  protected adjustPoint(point: ElementOption) {
    return;
  }

  protected addLine() {
    const props: any = this.options;
    const lineConfig = deepMix({}, props.line);
    if (lineConfig.visible) {
      const line = getGeom('line', 'guide', {
        type: 'line',
        plot: this,
        line: lineConfig,
      });
      this.adjustLine(line);
      this.setConfig('geometry', line);
      this.line = line;
    }
  }

  protected addPoint() {
    const props = this.options;
    const pointConfig = deepMix({}, props.point);
    if (pointConfig.visible) {
      const point = getGeom('point', 'guide', {
        plot: this,
      });
      this.adjustPoint(point);
      this.setConfig('geometry', point);
      this.point = point;
    }
  }

  protected animation() {
    super.animation();
    const props = this.options;
    if (props.animation === false) {
      // 关闭动画
      this.area.animate = false;
      if (this.line) this.line.animate = false;
      if (this.point) this.point.animate = false;
    }
  }

  protected label() {
    const props = this.options;
    const label = props.label as Label;

    if (label.visible === false) {
      if (this.line) {
        this.line.label = false;
      }
      this.area.label = false;
      return;
    }

    this.area.label = getComponent('label', {
      fields: [props.yField],
      plot: this,
    });
  }

  protected geometryTooltip() {
    this.area.tooltip = {};
    const tooltipOptions: any = this.options.tooltip;
    if (tooltipOptions.fields) {
      this.area.tooltip.fields = tooltipOptions.fields;
    }
    if (tooltipOptions.formatter) {
      this.area.tooltip.callback = tooltipOptions.formatter;
      if (!tooltipOptions.fields) {
        this.area.tooltip.fields = [this.options.xField, this.options.yField];
        if (this.options.seriesField) {
          this.area.tooltip.fields.push(this.options.seriesField);
        }
      }
    }
  }

  protected parseEvents(eventParser) {
    super.parseEvents(EventParser);
  }

  private applyResponsive(stage) {
    const methods = responsiveMethods[stage];
    each(methods, (r) => {
      const responsive = r as any;
      responsive.method(this);
    });
  }
}

registerPlotType('area', AreaLayer);
