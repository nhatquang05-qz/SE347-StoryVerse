import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import '../assets/styles/minigame/ChristmasEventPage.css';
import { IMAGES, DEFAULT_AVATAR, type DisplayWish } from '../components/minigame/minigameConstants';
import Snowfall from '../components/minigame/Snowfall';
import FlyingWishes from '../components/minigame/FlyingWishes';
import WishingTree from '../components/minigame/WishingTree';
import MysteryGiftModal from '../components/minigame/MysteryGiftModal';
import EventRulesModal from '../components/minigame/EventRulesModal';
import { EventHistoryModal } from '../components/minigame/EventHistoryModal';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const ChristmasEventPage: React.FC = () => {
	const { currentUser, token, fetchUser, loading: authLoading } = useAuth();
	const navigate = useNavigate();

	useEffect(() => {
		if (!authLoading && !currentUser) {
			navigate('/login', {
				replace: true,
				state: {
					from: '/christmas-event',
					message: 'Vui lòng đăng nhập để tham gia sự kiện Giáng sinh.',
				},
			});
		}
	}, [authLoading, currentUser, navigate]);

	const [showWheelModal, setShowWheelModal] = useState(false);
	const [showRulesModal, setShowRulesModal] = useState(false);
	const [showHistoryModal, setShowHistoryModal] = useState(false);

	const [isSpinning, setIsSpinning] = useState(false);
	const [rewardMessage, setRewardMessage] = useState('');
	const [finalReward, setFinalReward] = useState<any>(null);

	const [displayWishes, setDisplayWishes] = useState<DisplayWish[]>([]);
	const [wishInput, setWishInput] = useState('');
	const [isSending, setIsSending] = useState(false);

	const [freeSpins, setFreeSpins] = useState(0);
	const [hasWishedToday, setHasWishedToday] = useState(false);
	const [wishRewardCoins, setWishRewardCoins] = useState<number | null>(null);

	const [missions, setMissions] = useState<any>({
		LOGIN: { progress: 0, target: 1, isClaimed: 0 },
		BUY_COMIC: { progress: 0, target: 1, isClaimed: 0 },
		READ_CHAPTER: { progress: 0, target: 3, isClaimed: 0 },
	});

	const getRandomTreePosition = () => {
		const top = Math.floor(Math.random() * 65) + 15;
		const maxSpread = 40 - ((40 - 10) * (80 - top)) / (80 - 15);
		const left = Math.floor(Math.random() * (maxSpread * 2)) + (50 - maxSpread);
		return { top, left };
	};

	useEffect(() => {
		const fetchData = async () => {
			try {
				const resWishes = await axios.get(`${API_URL}/minigame/wishes`);
				const mapped = resWishes.data.map((w: any) => ({
					_id: w.id || w._id,
					content: w.content,
					user: {
						fullName: w.fullName || w.username || 'Ẩn danh',
						avatarUrl: w.avatarUrl || w.avatar || DEFAULT_AVATAR,
					},
					top: getRandomTreePosition().top,
					left: getRandomTreePosition().left,
					decorIndex: Math.floor(Math.random() * IMAGES.decors.length),
					animationDelay: Math.random() * 2,
				}));
				setDisplayWishes(mapped);

				if (token) {
					const resInfo = await axios.get(`${API_URL}/minigame/info`, {
						headers: { Authorization: `Bearer ${token}` },
					});
					setFreeSpins(resInfo.data.spins);
					setHasWishedToday(resInfo.data.hasWishedToday);
					if (resInfo.data.todayWishReward) {
						setWishRewardCoins(resInfo.data.todayWishReward);
					}
					setMissions(resInfo.data.missions);
				}
			} catch (error) {
				console.error(error);
			}
		};
		if (token) fetchData();
	}, [token]);

	const handleOpenGift = async () => {
		if (!currentUser || !token) return toast.error('Đăng nhập để mở quà!');
		if (freeSpins <= 0 && (currentUser.coinBalance || 0) < 20)
			return toast.error('Bạn cần thêm lượt hoặc 20 Xu!');
		if (isSpinning) return;

		setIsSpinning(true);
		setRewardMessage('');
		setFinalReward(null);

		try {
			const response = await axios.post(
				`${API_URL}/minigame/spin`,
				{},
				{ headers: { Authorization: `Bearer ${token}` } },
			);
			const { result, remainingSpins } = response.data;

			setTimeout(() => {
				setIsSpinning(false);
				setFinalReward(result);
				setRewardMessage(`🎉 Bạn nhận được: ${result.label}`);
				toast.success(`Nhận quà thành công: ${result.label}`);
				setFreeSpins(remainingSpins);
				fetchUser();
			}, 2000);
		} catch (error: any) {
			setIsSpinning(false);
			toast.error(error.response?.data?.message || 'Lỗi mở quà');
		}
	};

	const handleSendWish = async () => {
		if (!currentUser || !token) return toast.error('Vui lòng đăng nhập!');
		if (!wishInput.trim()) return;

		setIsSending(true);
		try {
			const res = await axios.post(
				`${API_URL}/minigame/wish`,
				{ content: wishInput },
				{ headers: { Authorization: `Bearer ${token}` } },
			);

			const { top, left } = getRandomTreePosition();
			const newWish: DisplayWish = {
				_id: Date.now(),
				user: {
					fullName: currentUser.fullName || 'Bạn',
					avatarUrl: currentUser.avatarUrl || DEFAULT_AVATAR,
				},
				content: wishInput,
				top,
				left,
				decorIndex: Math.floor(Math.random() * IMAGES.decors.length),
				animationDelay: 0,
			};
			setDisplayWishes((prev) => [newWish, ...prev]);
			setWishInput('');
			setHasWishedToday(true);
			setWishRewardCoins(res.data.reward);
			toast.success(res.data.message);
			fetchUser();
		} catch (error: any) {
			toast.error(error.response?.data?.message || 'Lỗi gửi lời chúc');
		} finally {
			setIsSending(false);
		}
	};

	if (authLoading || !currentUser) return null;

	return (
		<div
			className="xmas-container"
			style={{
				backgroundImage: `url(${IMAGES.background})`,
				backgroundSize: 'cover',
				backgroundPosition: 'center',
			}}
		>
			<button className="back-home-btn" onClick={() => navigate('/')}>
				⬅ Trang chủ
			</button>

			{currentUser && (
				<div className="event-header-actions">
					{}
					<div className="event-action-buttons">
						<button
							className="icon-btn rules-btn"
							onClick={() => setShowRulesModal(true)}
							title="Thể lệ"
						>
							?
						</button>
						<button
							className="icon-btn history-btn"
							onClick={() => setShowHistoryModal(true)}
							title="Lịch sử"
						>
							🕒
						</button>
					</div>

					<div className="user-header-info">
						<div className="user-details">
							<span className="c-user-name">{currentUser.fullName}</span>
							<span className="user-coins">
								<img src={IMAGES.coin} className="coin-icon" alt="xu" />{' '}
								{currentUser.coinBalance?.toLocaleString()}
							</span>
						</div>
						<img
							src={currentUser.avatarUrl || DEFAULT_AVATAR}
							className="user-avatar-top"
							onError={(e) => (e.currentTarget.src = DEFAULT_AVATAR)}
						/>
					</div>
				</div>
			)}

			<Snowfall />
			<FlyingWishes wishes={displayWishes} />
			<WishingTree wishes={displayWishes} />

			{}
			<div className="wish-input-bar">
				{hasWishedToday ? (
					<div
						className="wished-content"
						style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
					>
						<div className="wished-message">
							Bạn đã gửi lời chúc hôm nay rồi. Hãy quay lại ngày mai nhé!
						</div>
						{wishRewardCoins !== null && wishRewardCoins > 0 && (
							<div
								className="wish-reward-info"
								style={{
									color: '#FFD700',
									marginTop: '8px',
									fontWeight: 'bold',
									textAlign: 'center',
								}}
							>
								Bạn đã nhận được: {wishRewardCoins} Xu
							</div>
						)}
					</div>
				) : (
					<>
						<input
							type="text"
							className="wish-input-field"
							placeholder="Nhập lời chúc nhận quà ngẫu nhiên..."
							value={wishInput}
							onChange={(e) => setWishInput(e.target.value)}
							maxLength={50}
							onKeyDown={(e) => e.key === 'Enter' && handleSendWish()}
						/>
						<button
							className="wish-submit-btn"
							onClick={handleSendWish}
							disabled={isSending}
						>
							{isSending ? '...' : 'GỬI'}
						</button>
					</>
				)}
			</div>

			<div className="mission-board">
				<h3>🎄 Nhiệm Vụ</h3>
				<ul>
					<li className={missions.LOGIN.isClaimed ? 'completed' : ''}>
						<span>Đăng nhập</span>
						<span>
							{missions.LOGIN.isClaimed
								? 'Đã nhận'
								: `${missions.LOGIN.progress}/${missions.LOGIN.target}`}{' '}
							(+1 lượt mở quà)
						</span>
					</li>
					<li className={missions.BUY_COMIC.isClaimed ? 'completed' : ''}>
						<span>Mua truyện</span>
						<span>
							{missions.BUY_COMIC.isClaimed
								? 'Đã nhận'
								: `${missions.BUY_COMIC.progress}/${missions.BUY_COMIC.target}`}{' '}
							(+5 lượt mở quà)
						</span>
					</li>
					<li className={missions.READ_CHAPTER.isClaimed ? 'completed' : ''}>
						<span>Mở 3 chương</span>
						<span>
							{missions.READ_CHAPTER.isClaimed
								? 'Đã nhận'
								: `${missions.READ_CHAPTER.progress}/${missions.READ_CHAPTER.target}`}{' '}
							(+1 lượt mở quà)
						</span>
					</li>
				</ul>
			</div>

			<div className="gift-box-trigger" onClick={() => setShowWheelModal(true)}>
				<img
					src="https://cdn-icons-png.flaticon.com/512/6580/6580648.png"
					alt="Gift"
					style={{ width: '50px' }}
				/>
				<span>MỞ QUÀ NGAY</span>
			</div>

			<MysteryGiftModal
				isOpen={showWheelModal}
				onClose={() => setShowWheelModal(false)}
				isSpinning={isSpinning}
				handleSpin={handleOpenGift}
				rewardMessage={rewardMessage}
				freeSpins={freeSpins}
				finalReward={finalReward}
			/>

			{}
			<EventRulesModal isOpen={showRulesModal} onClose={() => setShowRulesModal(false)} />
			<EventHistoryModal
				isOpen={showHistoryModal}
				onClose={() => setShowHistoryModal(false)}
			/>
		</div>
	);
};

export default ChristmasEventPage;
