import { get, map, uniq } from 'lodash';
import monitorService from 'kubecube/services/monitor';
import { niceBytes, BPSunits } from 'kubecube/utils/functional';
const NumberFormatter = new Intl.NumberFormat('en-GB', {
    notation: 'compact',
    compactDisplay: 'short',
});

export const resolveTemplate = template => {
    const r = template.split(/\[\[([^\]]*)]\]|\$([a-zA-Z0-9_]+)/);
    // console.log(template, r);
    return obj => {
        if (r.length === 1) return template;

        return r.reduce((str, part) => {
            if (obj.hasOwnProperty(part)) str += obj[part];
            else str += part || '';
            return str;
        }, '');
    };
};

export function resolveLegend(template) {
    const r = template.split(/\{\{([^}]*)\}\}/);
    return obj => {
        console.log(obj, template);
        if (r.length === 1) return template;

        return r.reduce((str, part) => {
            part = part.trim();
            if (obj[part]) str += obj[part];
            else str += part;
            return str;
        }, '');
    };
}


function labelValuesQueryResolver(label, metric) {
    if (!metric) {
        return async () => {
            const result = await monitorService.getVariableLabel({
                pathParams: {
                    label,
                },
            });
            return map(get(result, 'data.data'), value => ({
                text: value,
                value,
            }));
        };
    }
    return async params => {
        const queryFunc = resolveTemplate(metric);
        const result = await monitorService.getVariableSeries({
            params: {
                'match[]': queryFunc(params),
            },
        });
        const labels = map(get(result, 'data'),
            metric => metric[label] || '').filter(label => label !== '');
        return uniq(labels).map(metric => ({
            text: metric,
            value: metric,
        }));
    };
}

export function resolveVariablesRequest(request) {
    const labelValuesRegex = /^label_values\((?:(.+),\s*)?([a-zA-Z_][a-zA-Z0-9_]*)\)\s*$/;
    const labelValuesQuery = request.match(labelValuesRegex);

    if (labelValuesQuery) {
        if (labelValuesQuery[1]) {
            return labelValuesQueryResolver(labelValuesQuery[2], labelValuesQuery[1]);
        }
        return labelValuesQueryResolver(labelValuesQuery[2], null);

    }
}

export function resolveFormatter(unit) {
    let formatter = d => d;
    if (unit === 'percentunit') {
        formatter = d => (d ? `${(+d * 100).toFixed(3)}%` : '-');
    }

    if (unit === 'bytes') {
        formatter = d => niceBytes(d);
    }

    if (unit === 'cores') {
        formatter = d => `${d} cores`;
    }

    if (unit === 'Bps') {
        formatter = d => niceBytes(d, BPSunits);
    }

    if (unit === 'pps') {
        formatter = d => `${NumberFormatter.format(d)} pps`;
    }

    // if (unit === 'pps') {
    //     formatter = d => `${NumberFormatter.format(d)}`;
    // }
    return formatter;
}