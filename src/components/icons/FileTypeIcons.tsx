import React from 'react';
import Svg, {
  Path,
  Rect,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';

interface FileTypeIconProps {
  size?: number;
}

const PAGE_PATH =
  'M 8 4 L 32 4 L 44 16 L 44 48 C 44 50.2 42.2 52 40 52 L 8 52 C 5.8 52 4 50.2 4 48 L 4 8 C 4 5.8 5.8 4 8 4 Z';
const FOLD_PATH =
  'M 32 4 L 32 14 C 32 15.1 32.9 16 34 16 L 44 16 Z';

/** The vibrant Red PDF document vector icon */
export const PdfFileIcon: React.FC<FileTypeIconProps> = ({ size = 32 }) => {
  const height = Math.round(size * 1.16);
  return (
    <Svg width={size} height={height} viewBox="0 0 48 56" testID="pdf-file-icon">
      <Defs>
        <LinearGradient id="pdfGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#F43F5E" />
          <Stop offset="100%" stopColor="#BE123C" />
        </LinearGradient>
      </Defs>
      {/* Document Sheet */}
      <Path d={PAGE_PATH} fill="url(#pdfGrad)" />
      {/* Folded Flap */}
      <Path d={FOLD_PATH} fill="#FDA4AF" />
      {/* White Center Badge */}
      <Rect x="8" y="21" width="32" height="15" rx="3.5" fill="#FFFFFF" />
      <SvgText
        x="24"
        y="32.5"
        textAnchor="middle"
        fontSize="9.5"
        fontWeight="900"
        fill="#BE123C"
        letterSpacing="0.6">
        PDF
      </SvgText>
      {/* Document Detail Lines */}
      <Rect x="10" y="41" width="28" height="2.5" rx="1.25" fill="#FFFFFF" fillOpacity={0.7} />
      <Rect x="10" y="45.5" width="18" height="2.5" rx="1.25" fill="#FFFFFF" fillOpacity={0.45} />
    </Svg>
  );
};

/** The vibrant Blue Word document vector icon */
export const WordFileIcon: React.FC<FileTypeIconProps> = ({ size = 32 }) => {
  const height = Math.round(size * 1.16);
  return (
    <Svg width={size} height={height} viewBox="0 0 48 56" testID="word-file-icon">
      <Defs>
        <LinearGradient id="wordGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#3B82F6" />
          <Stop offset="100%" stopColor="#1D4ED8" />
        </LinearGradient>
      </Defs>
      {/* Document Sheet */}
      <Path d={PAGE_PATH} fill="url(#wordGrad)" />
      {/* Folded Flap */}
      <Path d={FOLD_PATH} fill="#93C5FD" />
      {/* White Center Badge */}
      <Rect x="8" y="21" width="32" height="15" rx="3.5" fill="#FFFFFF" />
      <SvgText
        x="24"
        y="32.5"
        textAnchor="middle"
        fontSize="9"
        fontWeight="900"
        fill="#1D4ED8"
        letterSpacing="0.4">
        DOC
      </SvgText>
      {/* Document Detail Lines */}
      <Rect x="10" y="41" width="28" height="2.5" rx="1.25" fill="#FFFFFF" fillOpacity={0.7} />
      <Rect x="10" y="45.5" width="20" height="2.5" rx="1.25" fill="#FFFFFF" fillOpacity={0.45} />
    </Svg>
  );
};

/** The vibrant Green Excel/Sheets document vector icon */
export const SheetFileIcon: React.FC<FileTypeIconProps> = ({ size = 32 }) => {
  const height = Math.round(size * 1.16);
  return (
    <Svg width={size} height={height} viewBox="0 0 48 56" testID="sheet-file-icon">
      <Defs>
        <LinearGradient id="sheetGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#10B981" />
          <Stop offset="100%" stopColor="#047857" />
        </LinearGradient>
      </Defs>
      {/* Document Sheet */}
      <Path d={PAGE_PATH} fill="url(#sheetGrad)" />
      {/* Folded Flap */}
      <Path d={FOLD_PATH} fill="#6EE7B7" />
      {/* White Center Badge */}
      <Rect x="8" y="21" width="32" height="15" rx="3.5" fill="#FFFFFF" />
      <SvgText
        x="24"
        y="32.5"
        textAnchor="middle"
        fontSize="9"
        fontWeight="900"
        fill="#047857"
        letterSpacing="0.4">
        XLS
      </SvgText>
      {/* Spreadsheet Grid Lines */}
      <Rect x="10" y="40.5" width="28" height="7.5" rx="1.5" fill="#FFFFFF" fillOpacity={0.25} />
      <Path
        d="M 10 44 L 38 44 M 19 40.5 L 19 48 M 28 40.5 L 28 48"
        stroke="#FFFFFF"
        strokeWidth={1.2}
        strokeOpacity={0.8}
      />
    </Svg>
  );
};

/** The vibrant Orange PowerPoint document vector icon */
export const PptFileIcon: React.FC<FileTypeIconProps> = ({ size = 32 }) => {
  const height = Math.round(size * 1.16);
  return (
    <Svg width={size} height={height} viewBox="0 0 48 56" testID="ppt-file-icon">
      <Defs>
        <LinearGradient id="pptGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#F97316" />
          <Stop offset="100%" stopColor="#C2410C" />
        </LinearGradient>
      </Defs>
      {/* Document Sheet */}
      <Path d={PAGE_PATH} fill="url(#pptGrad)" />
      {/* Folded Flap */}
      <Path d={FOLD_PATH} fill="#FDBA74" />
      {/* White Center Badge */}
      <Rect x="8" y="21" width="32" height="15" rx="3.5" fill="#FFFFFF" />
      <SvgText
        x="24"
        y="32.5"
        textAnchor="middle"
        fontSize="9"
        fontWeight="900"
        fill="#C2410C"
        letterSpacing="0.4">
        PPT
      </SvgText>
      {/* Bar Chart Graphic */}
      <Rect x="12" y="43.5" width="4" height="4.5" rx="0.8" fill="#FFFFFF" fillOpacity={0.6} />
      <Rect x="19" y="41.5" width="4" height="6.5" rx="0.8" fill="#FFFFFF" fillOpacity={0.75} />
      <Rect x="26" y="39.5" width="4" height="8.5" rx="0.8" fill="#FFFFFF" fillOpacity={0.9} />
      <Rect x="33" y="42.5" width="4" height="5.5" rx="0.8" fill="#FFFFFF" fillOpacity={0.7} />
    </Svg>
  );
};

/** The vibrant Purple Code/Text document vector icon */
export const CodeFileIcon: React.FC<FileTypeIconProps> = ({ size = 32 }) => {
  const height = Math.round(size * 1.16);
  return (
    <Svg width={size} height={height} viewBox="0 0 48 56" testID="code-file-icon">
      <Defs>
        <LinearGradient id="codeGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#8B5CF6" />
          <Stop offset="100%" stopColor="#6D28D9" />
        </LinearGradient>
      </Defs>
      {/* Document Sheet */}
      <Path d={PAGE_PATH} fill="url(#codeGrad)" />
      {/* Folded Flap */}
      <Path d={FOLD_PATH} fill="#C4B5FD" />
      {/* White Center Badge */}
      <Rect x="8" y="21" width="32" height="15" rx="3.5" fill="#FFFFFF" />
      <SvgText
        x="24"
        y="32.5"
        textAnchor="middle"
        fontSize="9"
        fontWeight="900"
        fill="#6D28D9"
        letterSpacing="0.4">
        &lt;/&gt;
      </SvgText>
      {/* Code Indent Lines */}
      <Rect x="10" y="41" width="16" height="2.5" rx="1.25" fill="#FFFFFF" fillOpacity={0.7} />
      <Rect x="14" y="45.5" width="20" height="2.5" rx="1.25" fill="#FFFFFF" fillOpacity={0.5} />
    </Svg>
  );
};

/** The vibrant Amber/Pink Archive/Zip document vector icon */
export const ZipFileIcon: React.FC<FileTypeIconProps> = ({ size = 32 }) => {
  const height = Math.round(size * 1.16);
  return (
    <Svg width={size} height={height} viewBox="0 0 48 56" testID="zip-file-icon">
      <Defs>
        <LinearGradient id="zipGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#F59E0B" />
          <Stop offset="100%" stopColor="#B45309" />
        </LinearGradient>
      </Defs>
      {/* Document Sheet */}
      <Path d={PAGE_PATH} fill="url(#zipGrad)" />
      {/* Folded Flap */}
      <Path d={FOLD_PATH} fill="#FDE68A" />
      {/* White Center Badge */}
      <Rect x="8" y="21" width="32" height="15" rx="3.5" fill="#FFFFFF" />
      <SvgText
        x="24"
        y="32.5"
        textAnchor="middle"
        fontSize="9"
        fontWeight="900"
        fill="#B45309"
        letterSpacing="0.4">
        ZIP
      </SvgText>
      {/* Zipper Teeth Graphic */}
      <Rect x="22" y="40" width="4" height="2" fill="#FFFFFF" fillOpacity={0.8} />
      <Rect x="22" y="43" width="4" height="2" fill="#FFFFFF" fillOpacity={0.8} />
      <Rect x="22" y="46" width="4" height="2" fill="#FFFFFF" fillOpacity={0.8} />
    </Svg>
  );
};
