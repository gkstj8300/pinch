'use client';

import { useState } from 'react';
import { Button, Input } from '@/shared/ui';
import { searchAddress } from '@/shared/api';

interface AddressSearchFieldProps {
  address: string;
  latitude: number;
  longitude: number;
  onConfirm: (next: { address: string; latitude: number; longitude: number }) => void;
  onAddressInput: (address: string) => void;
  error?: string;
}

/**
 * 주소 입력 + "주소 확인" 버튼 + 카카오 좌표 결과 표시.
 *   - 사용자가 텍스트 입력 후 "주소 확인" → 카카오 로컬 API 호출 → 첫 결과 자동 채움
 *   - 좌표 채워지면 미리보기 노출 (정확 주소 + lat/lng 4자리)
 *   - 결과 없으면 안내, 네트워크 실패면 안내
 */
export function AddressSearchField({
  address,
  latitude,
  longitude,
  onConfirm,
  onAddressInput,
  error,
}: AddressSearchFieldProps) {
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const handleSearch = async () => {
    if (address.trim().length === 0) {
      setHint('주소를 먼저 입력해주세요');
      return;
    }
    setLoading(true);
    setHint(null);
    try {
      const result = await searchAddress(address);
      if (!result) {
        setHint('검색 결과가 없습니다. 주소를 다시 확인해주세요.');
        return;
      }
      onConfirm({
        address: result.addressName,
        latitude: result.latitude,
        longitude: result.longitude,
      });
    } catch {
      setHint('주소 확인에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const confirmed = latitude !== 0 || longitude !== 0;

  return (
    <div className="flex flex-col gap-(--spacing-02)">
      <div className="flex gap-(--spacing-02)">
        <div className="flex-1">
          <Input
            id="address"
            placeholder="예: 서울 중구 세종대로 110"
            value={address}
            onChange={(e) => onAddressInput(e.target.value)}
            error={error}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={handleSearch}
          disabled={loading}
          className="h-12 px-(--spacing-04) text-sm"
        >
          {loading ? '검색 중...' : '주소 확인'}
        </Button>
      </div>
      {confirmed && (
        <p className="text-xs text-(--color-success)">
          ✓ 확인됨 · 위도 {latitude.toFixed(4)}, 경도 {longitude.toFixed(4)}
        </p>
      )}
      {hint !== null && (
        <p className="text-xs text-(--color-error)">{hint}</p>
      )}
    </div>
  );
}
