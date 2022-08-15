import Token from 'markdown-it/lib/token';
import {Heading} from './typings';

function getTitle(token: Token) {
    return (
        token.children?.reduce((acc, tok) => {
            if (tok.type === 'text' || tok.type === 'code_inline') {
                return acc + tok.content;
            }

            return acc;
        }, '') || ''
    );
}

function getHref(token: Token) {
    return '#' + (token.attrGet('id') || '');
}

export = function getHeadings(tokens: Token[], needFilterHeadings: boolean) {
    const headings: Heading[] = [];
    let parents = [headings];
    let prevLevel;

    for (let i = 0; i < tokens.length; i++) {
        const isHeading = tokens[i].type === 'heading_open';
        const level = Number.parseInt(tokens[i].tag.slice(1), 10);

        if (!isHeading) {
            continue;
        }

        if ((needFilterHeadings && level >= 2) || !needFilterHeadings) {
            const entry = {
                title: getTitle(tokens[i + 1]),
                href: getHref(tokens[i]),
                level,
            };
            let closestParent = parents[parents.length - 1];

            if (
                (!prevLevel && level === 2) ||
                prevLevel === level ||
                (!needFilterHeadings && !prevLevel)
            ) {
                closestParent.push(entry);
                prevLevel = level;
                // if needFilterHeadings skip if nested heading level is lower than for previous by 2 or more
            } else if (
                prevLevel &&
                (level - prevLevel === 1 || (!needFilterHeadings && level > prevLevel))
            ) {
                const lastItemInClosestParent = closestParent[closestParent.length - 1];
                const newParent = (lastItemInClosestParent.items = [entry]);

                parents.push(newParent);
                prevLevel = level;
            } else if (prevLevel && level < prevLevel) {
                const closestParentIndex = getClosestParentIndex(
                    parents,
                    prevLevel,
                    level,
                    needFilterHeadings,
                );

                if (closestParentIndex < 0) {
                    continue;
                }

                closestParent = parents[closestParentIndex];
                closestParent.push(entry);
                parents = parents.slice(0, closestParentIndex + 1);
                prevLevel = level;
            }
        }
    }

    return headings;
};

function getClosestParentIndex(
    parents: Heading[][],
    prevLevel: number,
    level: number,
    needFilterHeadings: boolean,
) {
    let closestParentIndex = -1;

    if (needFilterHeadings) {
        const levelDiff = prevLevel - level;
        closestParentIndex = parents.length - levelDiff - 1;
    } else {
        for (let i = parents.length - 2; i >= 0; i--) {
            const parent = parents[i];
            const parentLevel = parent[0].level;

            if (parentLevel <= level) {
                closestParentIndex = i;
                break;
            }
        }
    }

    return closestParentIndex;
}
