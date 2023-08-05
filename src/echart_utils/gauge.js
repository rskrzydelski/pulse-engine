export function getOptions(init_ratio, current_ratio) {
  let colored_line_width = 4;

  let short_lines_len = 4;
  let short_lines_distance = -20;
  let short_lines_width = 2;

  let long_lines_len = 10;
  let long_lines_width = 4;

  let values_font_size = 10;
  let values_distance = 30;

  let current_value_font_size = 10;

  let pointer_width = 1;

    const options = {
        series: [
          {
            type: 'gauge',
            min: 0,
            max: 2*init_ratio,
            axisLine: {
              lineStyle: {
                width: colored_line_width,
                color: [
                  [0.3, "#f00"],
                  [0.7, "#0f5"],
                  [1, "#f00"]
                ]
              }
            },
            pointer: {
              width: pointer_width,
              itemStyle: {
                color: 'inherit'
              }
            },
            axisTick: {
              distance: short_lines_distance,
              length: short_lines_len,
              lineStyle: {
                color: '#fff',
                width: short_lines_width
              }
            },
            splitLine: {
              distance: -30,
              length: long_lines_len,
              lineStyle: {
                color: '#fff',
                width: long_lines_width
              }
            },
            axisLabel: {
              color: 'inherit',
              distance: values_distance,
              fontSize: values_font_size,
            },
            detail: {
              fontSize: current_value_font_size,
              valueAnimation: true,
              formatter: '{value} ratio',
              color: "white",
            },
            data: [
              {
                value: current_ratio
              }
            ]
          }
        ]
    };

    return options;
}

export function updateValue(val) {
  return {series: [
    {
      data: [
        {
          value: val
        }
      ]
    }
  ]}
}