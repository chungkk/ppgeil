import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import ProtectedPage from '../components/ProtectedPage';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { fetchWithAuth } from '../lib/api';
import styles from '../styles/CityBuilder.module.css';

const BUILDING_TYPES = [
  { id: 'grass', name: 'Cỏ', icon: '🌱', cost: 0 },
  { id: 'road', name: 'Đường', icon: '🛣️', cost: 10 },
  { id: 'house', name: 'Nhà', icon: '🏠', cost: 50 },
  { id: 'shop', name: 'Cửa hàng', icon: '🏪', cost: 100 },
  { id: 'school', name: 'Trường học', icon: '🏫', cost: 200 },
  { id: 'park', name: 'Công viên', icon: '🌳', cost: 80 },
  { id: 'hospital', name: 'Bệnh viện', icon: '🏥', cost: 300 },
  { id: 'factory', name: 'Nhà máy', icon: '🏭', cost: 250 },
  { id: 'office', name: 'Văn phòng', icon: '🏢', cost: 150 },
  { id: 'tower', name: 'Tòa tháp', icon: '🏰', cost: 500 },
];

function CityBuilderPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, userPoints, updateUserPoints } = useAuth();
  const [city, setCity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadCity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCity = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth('/api/city');
      const data = await res.json();
      
      if (data.success) {
        setCity(data.city);
      }
    } catch (error) {
      console.error('Error loading city:', error);
      showMessage('Lỗi khi tải thành phố', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text, type = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const getBuildingAt = (x, y) => {
    if (!city) return null;
    return city.buildings.find(b => b.x === x && b.y === y);
  };

  const isRoadAt = (x, y) => {
    const building = getBuildingAt(x, y);
    return building && building.type === 'road';
  };

  const getRoadType = (x, y) => {
    if (!isRoadAt(x, y)) return null;

    const top = isRoadAt(x, y - 1);
    const right = isRoadAt(x + 1, y);
    const bottom = isRoadAt(x, y + 1);
    const left = isRoadAt(x - 1, y);

    const connections = [top, right, bottom, left].filter(Boolean).length;

    if (connections === 0) return 'single';
    if (connections === 1) {
      if (top || bottom) return 'vertical';
      return 'horizontal';
    }
    if (connections === 2) {
      if (top && bottom) return 'vertical';
      if (left && right) return 'horizontal';
      if (top && right) return 'corner-tr';
      if (right && bottom) return 'corner-br';
      if (bottom && left) return 'corner-bl';
      if (left && top) return 'corner-tl';
    }
    if (connections === 3) {
      if (!top) return 't-bottom';
      if (!right) return 't-left';
      if (!bottom) return 't-top';
      if (!left) return 't-right';
    }
    if (connections === 4) return 'cross';

    return 'horizontal';
  };

  const handleCellClick = async (x, y) => {
    if (!selectedBuilding) {
      showMessage('Vui lòng chọn một tòa nhà từ menu bên trên', 'warning');
      return;
    }

    const existingBuilding = getBuildingAt(x, y);
    
    if (existingBuilding) {
      if (confirm('Bạn có muốn xóa tòa nhà này không?')) {
        await removeBuilding(x, y);
      }
      return;
    }

    if (selectedBuilding.cost > userPoints) {
      showMessage(`Không đủ điểm! Cần ${selectedBuilding.cost} điểm.`, 'error');
      return;
    }

    await placeBuilding(x, y);
  };

  const placeBuilding = async (x, y) => {
    try {
      const res = await fetchWithAuth('/api/city/place-building', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buildingType: selectedBuilding.id,
          x,
          y,
          cost: selectedBuilding.cost
        })
      });

      const data = await res.json();

      if (data.success) {
        setCity(prev => {
          const newBuildings = [...prev.buildings, data.building];
          return {
            ...prev,
            buildings: newBuildings,
            totalSpent: data.totalSpent
          };
        });
        updateUserPoints(data.userPoints);
        showMessage(`Đã xây ${selectedBuilding.name}! -${selectedBuilding.cost} điểm`, 'success');
      } else {
        showMessage(data.message || 'Lỗi khi xây tòa nhà', 'error');
      }
    } catch (error) {
      console.error('Error placing building:', error);
      showMessage('Lỗi khi xây tòa nhà', 'error');
    }
  };

  const removeBuilding = async (x, y) => {
    try {
      const res = await fetchWithAuth('/api/city/remove-building', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x, y })
      });

      const data = await res.json();

      if (data.success) {
        setCity(prev => {
          const newBuildings = prev.buildings.filter(b => !(b.x === x && b.y === y));
          return {
            ...prev,
            buildings: newBuildings
          };
        });
        showMessage('Đã xóa tòa nhà', 'info');
      } else {
        showMessage(data.message || 'Lỗi khi xóa tòa nhà', 'error');
      }
    } catch (error) {
      console.error('Error removing building:', error);
      showMessage('Lỗi khi xóa tòa nhà', 'error');
    }
  };

  const renderGrid = () => {
    if (!city) return null;

    const cells = [];
    for (let y = 0; y < city.gridSize; y++) {
      for (let x = 0; x < city.gridSize; x++) {
        const building = getBuildingAt(x, y);
        const isHovered = hoveredCell && hoveredCell.x === x && hoveredCell.y === y;
        const roadType = building?.type === 'road' ? getRoadType(x, y) : null;
        
        cells.push(
          <div
            key={`${x}-${y}`}
            className={`${styles.cell} ${isHovered ? styles.hovered : ''} ${
              roadType ? styles[`road-${roadType}`] : ''
            }`}
            onClick={() => handleCellClick(x, y)}
            onMouseEnter={() => setHoveredCell({ x, y })}
            onMouseLeave={() => setHoveredCell(null)}
          >
            {building ? (
              building.type === 'road' ? (
                <div className={styles.roadTile}></div>
              ) : (
                <span className={styles.buildingIcon}>
                  {BUILDING_TYPES.find(t => t.id === building.type)?.icon || '❓'}
                </span>
              )
            ) : (
              <span className={styles.emptyCell}>🌱</span>
            )}
          </div>
        );
      }
    }
    return cells;
  };

  if (loading) {
    return (
      <ProtectedPage>
        <DashboardLayout>
          <div className={styles.container}>
            <div className={styles.loading}>Đang tải thành phố...</div>
          </div>
        </DashboardLayout>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage>
      <DashboardLayout>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>🏙️ Xây Dựng Thành Phố</h1>
            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Điểm hiện tại:</span>
                <span className={styles.statValue}>{userPoints}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Đã chi:</span>
                <span className={styles.statValue}>{city?.totalSpent || 0}</span>
              </div>
            </div>
          </div>

          {message && (
            <div className={`${styles.message} ${styles[message.type]}`}>
              {message.text}
            </div>
          )}

          <div className={styles.buildingMenu}>
            <h3 className={styles.menuTitle}>Chọn tòa nhà:</h3>
            <div className={styles.buildingList}>
              {BUILDING_TYPES.map(building => (
                <button
                  key={building.id}
                  className={`${styles.buildingButton} ${
                    selectedBuilding?.id === building.id ? styles.selected : ''
                  } ${building.cost > userPoints ? styles.disabled : ''}`}
                  onClick={() => setSelectedBuilding(building)}
                >
                  <span className={styles.buildingButtonIcon}>{building.icon}</span>
                  <span className={styles.buildingButtonName}>{building.name}</span>
                  <span className={styles.buildingButtonCost}>
                    {building.cost === 0 ? 'Miễn phí' : `${building.cost}đ`}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.gridContainer}>
            <div 
              className={styles.grid}
              style={{
                gridTemplateColumns: `repeat(${city?.gridSize || 20}, 1fr)`,
                gridTemplateRows: `repeat(${city?.gridSize || 20}, 1fr)`
              }}
            >
              {renderGrid()}
            </div>
          </div>

          <div className={styles.instructions}>
            <p>💡 <strong>Hướng dẫn:</strong></p>
            <ul>
              <li>Chọn một tòa nhà từ menu trên</li>
              <li>Click vào ô trống trên lưới để xây</li>
              <li>Click vào tòa nhà đã xây để xóa (không hoàn điểm)</li>
              <li>Kiếm điểm bằng cách hoàn thành bài học!</li>
            </ul>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedPage>
  );
}

export default CityBuilderPage;
