import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  GestureResponderEvent,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui';
import { notifySuccess, tapLight, tapMedium } from '@/lib/haptics';

export type DrawingPath = {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  width: number;
};

export type FormulaStamp = {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
};

const PALETTE = [
  '#FFFFFF', // White chalk
  '#38BDF8', // Cyan / Light Blue
  '#34D399', // Emerald Green
  '#FBBF24', // Gold / Yellow
  '#F87171', // Coral Red
  '#C084FC', // Lavender Purple
];

const MATH_FORMULAS = [
  '∫ f(x) dx = F(x) + C',
  'd/dx [u·v] = u\'v + uv\'',
  'e^(iπ) + 1 = 0',
  'O(n log n)',
  '∇ · E = ρ / ε₀',
  'lim (x→0) sin(x)/x = 1',
  'λ = h / p',
];

export function InteractiveWhiteboardModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [selectedColor, setSelectedColor] = useState('#FFFFFF');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  const [stamps, setStamps] = useState<FormulaStamp[]>([]);
  const [showFormulaPicker, setShowFormulaPicker] = useState(false);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt: GestureResponderEvent) => {
      const { locationX, locationY } = evt.nativeEvent;
      setCurrentPath([{ x: locationX, y: locationY }]);
    },
    onPanResponderMove: (evt: GestureResponderEvent) => {
      const { locationX, locationY } = evt.nativeEvent;
      setCurrentPath((prev) => [...prev, { x: locationX, y: locationY }]);
    },
    onPanResponderRelease: () => {
      if (currentPath.length > 0) {
        setPaths((prev) => [
          ...prev,
          {
            id: `path-${Date.now()}-${Math.random()}`,
            points: currentPath,
            color: isEraser ? '#0B0F19' : selectedColor,
            width: isEraser ? 24 : strokeWidth,
          },
        ]);
        setCurrentPath([]);
      }
    },
  });

  const handleClear = () => {
    tapMedium();
    setPaths([]);
    setStamps([]);
  };

  const handleUndo = () => {
    tapLight();
    if (stamps.length > 0 && paths.length === 0) {
      setStamps((prev) => prev.slice(0, -1));
    } else {
      setPaths((prev) => prev.slice(0, -1));
    }
  };

  const handleAddFormula = (formulaText: string) => {
    tapLight();
    notifySuccess();
    const newStamp: FormulaStamp = {
      id: `stamp-${Date.now()}`,
      text: formulaText,
      x: 30 + Math.random() * 120,
      y: 60 + stamps.length * 45,
      color: selectedColor,
    };
    setStamps((prev) => [...prev, newStamp]);
    setShowFormulaPicker(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0B0F19' }}>
        {/* Top Whiteboard Header */}
        <View style={wbStyles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={wbStyles.badgeIcon}>
              <Ionicons name="pencil" size={16} color="#38BDF8" />
            </View>
            <View>
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
                Classroom Whiteboard ✏️
              </Text>
              <Text style={{ color: '#9CA3AF', fontSize: 11 }}>
                Live collaborative math & teaching canvas
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable onPress={handleUndo} style={wbStyles.actionBtn}>
              <Ionicons name="arrow-undo" size={18} color="#D1D5DB" />
            </Pressable>
            <Pressable onPress={handleClear} style={wbStyles.actionBtn}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </Pressable>
            <Pressable onPress={onClose} style={[wbStyles.actionBtn, { backgroundColor: '#1E293B' }]}>
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {/* Toolbar & Controls Bar */}
        <View style={wbStyles.toolbar}>
          {/* Color Palette */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, alignItems: 'center' }}>
            {PALETTE.map((c) => (
              <Pressable
                key={c}
                onPress={() => {
                  setIsEraser(false);
                  setSelectedColor(c);
                  tapLight();
                }}
                style={[
                  wbStyles.colorDot,
                  { backgroundColor: c },
                  selectedColor === c && !isEraser && wbStyles.colorDotActive,
                ]}
              />
            ))}

            <View style={{ width: 1, height: 20, backgroundColor: '#334155', marginHorizontal: 4 }} />

            {/* Stroke Width Toggle */}
            {[2, 4, 8].map((w) => (
              <Pressable
                key={w}
                onPress={() => {
                  setStrokeWidth(w);
                  tapLight();
                }}
                style={[
                  wbStyles.widthChip,
                  strokeWidth === w && { backgroundColor: '#3B82F6' },
                ]}
              >
                <View
                  style={{
                    width: w * 2.5,
                    height: w * 2.5,
                    borderRadius: (w * 2.5) / 2,
                    backgroundColor: '#FFFFFF',
                  }}
                />
              </Pressable>
            ))}

            <View style={{ width: 1, height: 20, backgroundColor: '#334155', marginHorizontal: 4 }} />

            {/* Eraser Tool */}
            <Pressable
              onPress={() => {
                setIsEraser((prev) => !prev);
                tapLight();
              }}
              style={[
                wbStyles.toolBtn,
                isEraser && { backgroundColor: '#EF4444' },
              ]}
            >
              <Ionicons name="cut-outline" size={16} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>Eraser</Text>
            </Pressable>

            {/* Math Formula Stamper Tool */}
            <Pressable
              onPress={() => setShowFormulaPicker(true)}
              style={[wbStyles.toolBtn, { backgroundColor: '#6366F1' }]}
            >
              <Ionicons name="calculator-outline" size={16} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>+ Formula</Text>
            </Pressable>
          </ScrollView>
        </View>

        {/* Main Canvas Drawing Area */}
        <View style={wbStyles.canvas} {...panResponder.panHandlers}>
          {/* Grid lines background effect */}
          <View style={wbStyles.gridOverlay} />

          {/* Stamped Formulas */}
          {stamps.map((stamp) => (
            <View
              key={stamp.id}
              style={{
                position: 'absolute',
                top: stamp.y,
                left: stamp.x,
                backgroundColor: 'rgba(30, 41, 59, 0.85)',
                borderColor: stamp.color,
                borderWidth: 1.5,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
            >
              <Text style={{ color: stamp.color, fontSize: 14, fontWeight: '800', fontFamily: 'monospace' }}>
                {stamp.text}
              </Text>
            </View>
          ))}

          {/* Render Committed Drawing Paths */}
          {paths.map((p) => (
            <View key={p.id} pointerEvents="none" style={StyleSheet.absoluteFill}>
              {p.points.map((pt, idx) => (
                <View
                  key={idx}
                  style={{
                    position: 'absolute',
                    left: pt.x - p.width / 2,
                    top: pt.y - p.width / 2,
                    width: p.width,
                    height: p.width,
                    borderRadius: p.width / 2,
                    backgroundColor: p.color,
                  }}
                />
              ))}
            </View>
          ))}

          {/* Render Active Finger Path */}
          {currentPath.map((pt, idx) => (
            <View
              key={`active-${idx}`}
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: pt.x - (isEraser ? 12 : strokeWidth / 2),
                top: pt.y - (isEraser ? 12 : strokeWidth / 2),
                width: isEraser ? 24 : strokeWidth,
                height: isEraser ? 24 : strokeWidth,
                borderRadius: isEraser ? 12 : strokeWidth / 2,
                backgroundColor: isEraser ? 'rgba(239, 68, 68, 0.4)' : selectedColor,
              }}
            />
          ))}

          {paths.length === 0 && stamps.length === 0 && (
            <View style={wbStyles.emptyHint} pointerEvents="none">
              <Ionicons name="finger-print" size={32} color="#475569" />
              <Text style={{ color: '#64748B', fontSize: 13, fontWeight: '600', marginTop: 8 }}>
                Draw with your finger or tap "+ Formula" to annotate
              </Text>
            </View>
          )}
        </View>

        {/* Math Formula Picker Sheet */}
        {showFormulaPicker && (
          <View style={wbStyles.formulaModalBackdrop}>
            <View style={wbStyles.formulaCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>Insert Math / CS Formula</Text>
                <Pressable onPress={() => setShowFormulaPicker(false)}>
                  <Ionicons name="close" size={20} color="#9CA3AF" />
                </Pressable>
              </View>

              <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
                {MATH_FORMULAS.map((f, i) => (
                  <Pressable
                    key={i}
                    onPress={() => handleAddFormula(f)}
                    style={({ pressed }) => [
                      wbStyles.formulaRow,
                      pressed && { opacity: 0.7, backgroundColor: '#334155' },
                    ]}
                  >
                    <Text style={{ color: '#38BDF8', fontSize: 14, fontWeight: '700', fontFamily: 'monospace' }}>
                      {f}
                    </Text>
                    <Ionicons name="add-circle" size={20} color="#34D399" />
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const wbStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  badgeIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  toolbar: {
    backgroundColor: '#0F172A',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  colorDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotActive: {
    borderColor: '#38BDF8',
    transform: [{ scale: 1.15 }],
  },
  widthChip: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  canvas: {
    flex: 1,
    backgroundColor: '#090D16',
    position: 'relative',
    overflow: 'hidden',
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.05,
    borderWidth: 0.5,
    borderColor: '#FFFFFF',
  },
  emptyHint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formulaModalBackdrop: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
    zIndex: 999,
  },
  formulaCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  formulaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
});
