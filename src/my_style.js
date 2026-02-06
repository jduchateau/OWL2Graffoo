import {GRAFFOO_STYLES} from './styles_output.js';

export const MY_GRAFFOO_STYLES = {
  // dotted arrow
  SubClassOf: 'endArrow=block;html=1;textDirection=ltr;dashed=1;dashPattern=1 1',
  // link with double line
  EquivalentClass: 'endArrow=none;html=1;textDirection=ltr;shape=link',
  ClassUML: GRAFFOO_STYLES.Class + ';html=1;shape=swimlane;startSize=20;',
  ClassAttributeUML: 'text;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;portConstraint=eastwest;whiteSpace=wrap;html=1;',

  PrefixHeader: 'graphMlID=n0;shape=swimlane;startSize=20;fillColor=#b7b69e;strokeColor=#000000;strokeWidth=1.0;align=right;spacingRight=10;fontStyle=1',
  PrefixColumnPrefix: 'text;html=1;align=center;verticalAlign=middle;autosize=1;fontFamily=Courier New;',
  PrefixColumnUrl: 'text;html=1;align=left;verticalAlign=middle;autosize=1;fontFamily=Courier New;',
}